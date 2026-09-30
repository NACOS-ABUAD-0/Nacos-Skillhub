-- NACOS Skills Hub — mentors author track content; messaging goes live.
--
-- 1. Approved mentors manage mini-projects for their own track.
-- 2. Skill paths: milestone_templates become a per-track roadmap that the
--    track's approved mentors build and mentees follow.
-- 3. Messaging: realtime on messages + a way for the recipient to mark a
--    thread read.
--
-- Safe to re-run.

-- ===========================================================================
-- 1. Mini-projects — mentors write within their own track
-- ===========================================================================
drop policy if exists mini_projects_write_mentor on public.mini_projects;

create policy mini_projects_write_mentor on public.mini_projects
  for all
  using (track = public.current_mentor_track())
  with check (track = public.current_mentor_track() and created_by = auth.uid());

-- ===========================================================================
-- 2. Skill path roadmap (milestone_templates)
-- ===========================================================================
alter table public.milestone_templates
  add column if not exists resource_url text,
  add column if not exists created_by uuid references public.profiles (id) on delete set null,
  add column if not exists created_at timestamptz not null default now();

create index if not exists milestone_templates_track_order_idx
  on public.milestone_templates (track, order_index);

drop policy if exists milestone_templates_write_mentor on public.milestone_templates;

-- Updates (e.g. reordering) may touch steps another mentor of the same
-- track created, so the check only pins the track, not the author.
create policy milestone_templates_write_mentor on public.milestone_templates
  for all
  using (track = public.current_mentor_track())
  with check (track = public.current_mentor_track());

-- ===========================================================================
-- 3. Messaging
-- ===========================================================================

-- Stream new messages to participants (Realtime applies the select policy).
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- Recipients can't update messages directly (no update policy), so reading a
-- thread goes through this: it only ever stamps read_at on the other
-- participant's messages in a thread the caller belongs to.
create or replace function public.mark_thread_read(p_thread uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.messages m
     set read_at = now()
   where m.thread_id = p_thread
     and m.sender_id <> auth.uid()
     and m.read_at is null
     and exists (
       select 1 from public.message_threads t
       where t.id = p_thread
         and (t.participant_a = auth.uid() or t.participant_b = auth.uid())
     );
$$;

revoke execute on function public.mark_thread_read(uuid) from anon, public;
grant execute on function public.mark_thread_read(uuid) to authenticated;
