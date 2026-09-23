-- ===========================================================================
-- Match participants can see each other's profile.
-- Without this, a mentor can read the match row but not the mentee's
-- profile (profiles RLS only exposes own/admin/approved mentors), so the
-- mentee shows up as "Unknown".
-- ===========================================================================
create policy profiles_select_match_participants on public.profiles
  for select using (
    exists (
      select 1 from public.mentee_mentor_matches m
      where (m.mentor_id = auth.uid() and m.mentee_id = profiles.id)
         or (m.mentee_id = auth.uid() and m.mentor_id = profiles.id)
    )
  );

-- ===========================================================================
-- Only the mentor (or an admin) can activate a match. The update/insert
-- policies let either participant write the row, so without this a mentee
-- could accept their own request.
-- ===========================================================================
create or replace function public.guard_match_activation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'active'
     and (tg_op = 'INSERT' or old.status <> 'active')
     and auth.uid() is distinct from new.mentor_id
     and not public.is_admin() then
    raise exception 'Only the mentor can accept a match request.';
  end if;
  return new;
end;
$$;

create trigger mentee_mentor_matches_guard_activation
  before insert or update on public.mentee_mentor_matches
  for each row execute function public.guard_match_activation();
