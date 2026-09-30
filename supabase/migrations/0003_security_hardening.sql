-- NACOS Skills Hub — security hardening
--
-- Fixes, in order:
--   1. handle_new_user copied `role` / `mentor_status` straight from
--      client-supplied signup metadata, so anyone could call
--      auth.signUp({ data: { role: 'admin' } }) with the public anon key and
--      become an admin (or an already-approved mentor).
--   2. profiles_update_own let users rewrite their own role / mentor_status
--      / email, and at the same time blocked approved mentors from editing
--      their profile at all. Privileged columns are now guarded by a trigger
--      and "apply as mentor" goes through a security-definer RPC.
--   3. A mentee could open a "match" with any profile (not just approved
--      mentors) and thereby read that person's full profile, or rewrite
--      match rows they were part of.
--   4. Mentees could self-approve their own mini-project submissions.
--   5. Mentors could not see certificates they had issued (so the UI let them
--      sign the same one repeatedly), and could sign for mentees they weren't
--      matched with.
--   6. Assorted write policies (threads, sessions, PR reviews, milestones,
--      mentor_meta, mentor_applications) accepted rows for arbitrary users.
--   7. profiles.email drifted from auth.users.email after an email change.
--
-- Guard triggers below are SECURITY INVOKER on purpose: they check
-- `current_user`, which is 'anon' / 'authenticated' for requests coming
-- through the Data API, and something else (postgres, service_role,
-- supabase_auth_admin, or the owner of a security-definer function) for
-- trusted server-side writes, which are allowed through.

-- ===========================================================================
-- Helpers (security definer so policies can use them without RLS recursion)
-- ===========================================================================
create or replace function public.is_trusted_writer()
returns boolean
language sql
stable
set search_path = public
as $$
  select current_user not in ('anon', 'authenticated') or public.is_admin();
$$;

create or replace function public.is_approved_mentor(p_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = p_user and role = 'mentor' and mentor_status = 'approved'
  );
$$;

create or replace function public.has_active_match(p_mentor uuid, p_mentee uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mentee_mentor_matches
    where mentor_id = p_mentor and mentee_id = p_mentee and status = 'active'
  );
$$;

-- Track of the caller if they are an approved mentor, otherwise null.
create or replace function public.current_mentor_track()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select track from public.profiles
  where id = auth.uid() and role = 'mentor' and mentor_status = 'approved';
$$;

revoke execute on function public.is_approved_mentor(uuid) from anon;
revoke execute on function public.has_active_match(uuid, uuid) from anon;
revoke execute on function public.current_mentor_track() from anon;

-- ===========================================================================
-- 2. New-user trigger: never trust client metadata for privileges
-- The only self-service choices are "mentee" (default) or "mentor applicant"
-- (role mentor, status pending). Admin and approved-mentor can only be
-- granted by an admin afterwards.
-- ===========================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  wants_mentor boolean := coalesce(meta ->> 'role', '') = 'mentor';
begin
  insert into public.profiles (id, email, full_name, matric_number, role, mentor_status, level, specialization, track, avatar_initials)
  values (
    new.id,
    lower(new.email),
    left(coalesce(meta ->> 'full_name', ''), 120),
    left(coalesce(meta ->> 'matric_number', ''), 40),
    case when wants_mentor then 'mentor' else 'mentee' end,
    case when wants_mentor then 'pending' else 'none' end,
    meta ->> 'level',
    case when wants_mentor then meta ->> 'specialization' end,
    (select name from public.tracks where name = meta ->> 'track'),
    left(meta ->> 'avatar_initials', 4)
  );

  if wants_mentor then
    insert into public.mentor_applications (user_id, full_name, email, matric_number, level, specialization, status)
    values (
      new.id,
      left(coalesce(meta ->> 'full_name', ''), 120),
      lower(new.email),
      left(coalesce(meta ->> 'matric_number', ''), 40),
      coalesce(meta ->> 'level', ''),
      coalesce(meta ->> 'specialization', ''),
      'pending'
    );
  end if;

  return new;
end;
$$;

-- ===========================================================================
-- 8. Keep profiles.email in sync with auth.users.email
-- ===========================================================================
create or replace function public.handle_user_email_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ===========================================================================
-- 3. Profiles: users may edit their own profile, but not privileged columns
-- ===========================================================================
drop policy if exists profiles_update_own on public.profiles;

create policy profiles_update_own on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

create or replace function public.guard_profile_update()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;

  if new.id is distinct from old.id
     or new.email is distinct from old.email
     or new.role is distinct from old.role
     or new.mentor_status is distinct from old.mentor_status
     or new.created_at is distinct from old.created_at then
    raise exception 'Role, mentor status and email can only be changed by an admin.'
      using errcode = 'insufficient_privilege';
  end if;

  -- A mentor's track decides which submissions they can review, so it is
  -- fixed once they have applied.
  if old.role = 'mentor'
     and (new.track is distinct from old.track
          or new.specialization is distinct from old.specialization) then
    raise exception 'Ask an admin to change your mentoring track.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- The public mentor directory is for signed-in users, not the whole internet.
drop policy if exists profiles_select_approved_mentors on public.profiles;

create policy profiles_select_approved_mentors on public.profiles
  for select using (
    auth.uid() is not null and role = 'mentor' and mentor_status = 'approved'
  );

-- Approved mentors can see the names of mentees who submitted work in their
-- track (the review queue shows "Mentee" otherwise). Goes through a
-- security-definer helper: querying mini_project_submissions directly here
-- would re-enter profiles RLS and fail with "infinite recursion detected".
create or replace function public.submitted_in_my_track(p_mentee uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.mini_project_submissions s
    join public.mini_projects p on p.id = s.project_id
    where s.mentee_id = p_mentee
      and p.track = public.current_mentor_track()
  );
$$;

revoke execute on function public.submitted_in_my_track(uuid) from anon;

drop policy if exists profiles_select_track_submitters on public.profiles;
create policy profiles_select_track_submitters on public.profiles
  for select using (public.submitted_in_my_track(id));

-- Same idea for the reviewer read policy: use the helper instead of joining
-- profiles under RLS.
drop policy if exists submissions_select_mentor on public.mini_project_submissions;

create policy submissions_select_mentor on public.mini_project_submissions
  for select using (
    exists (
      select 1 from public.mini_projects mp
      where mp.id = mini_project_submissions.project_id
        and mp.track = public.current_mentor_track()
    )
  );

-- An existing mentee applying to mentor. Replaces the client-side
-- profiles.update(role = 'mentor'), which the guard above now blocks.
create or replace function public.apply_as_mentor(
  p_full_name text,
  p_matric_number text,
  p_level text,
  p_specialization text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles;
begin
  if uid is null then
    raise exception 'Not signed in.' using errcode = 'insufficient_privilege';
  end if;

  select * into prof from public.profiles where id = uid for update;
  if not found then
    raise exception 'Profile not found.';
  end if;
  if prof.role <> 'mentee' then
    raise exception 'Only mentee accounts can apply to become a mentor.';
  end if;
  if coalesce(trim(p_full_name), '') = '' or coalesce(trim(p_matric_number), '') = '' then
    raise exception 'Full name and matric number are required.';
  end if;
  if p_level is null or p_level not in ('300L', '400L', '500L', 'Alumni') then
    raise exception 'Choose a valid level.';
  end if;
  if not exists (select 1 from public.tracks where name = p_specialization) then
    raise exception 'Choose a valid track.';
  end if;

  update public.profiles
     set role = 'mentor',
         mentor_status = 'pending',
         full_name = left(trim(p_full_name), 120),
         matric_number = left(trim(p_matric_number), 40),
         level = p_level,
         specialization = p_specialization,
         track = p_specialization
   where id = uid;

  insert into public.mentor_applications (user_id, full_name, email, matric_number, level, specialization, status)
  values (uid, left(trim(p_full_name), 120), prof.email, left(trim(p_matric_number), 40), p_level, p_specialization, 'pending');
end;
$$;

revoke execute on function public.apply_as_mentor(text, text, text, text) from public, anon;
grant execute on function public.apply_as_mentor(text, text, text, text) to authenticated;

-- Applications are only ever filed by handle_new_user or apply_as_mentor.
drop policy if exists mentor_applications_insert_own on public.mentor_applications;

-- ===========================================================================
-- 4. Matches
-- ===========================================================================
drop policy if exists matches_insert_mentee on public.mentee_mentor_matches;

create policy matches_insert_mentee on public.mentee_mentor_matches
  for insert with check (
    public.is_admin()
    or (
      mentee_id = auth.uid()
      and mentor_id <> auth.uid()
      and status = 'requested'
      and public.is_approved_mentor(mentor_id)
    )
  );

drop policy if exists matches_update_participant on public.mentee_mentor_matches;

create policy matches_update_participant on public.mentee_mentor_matches
  for update
  using (mentee_id = auth.uid() or mentor_id = auth.uid() or public.is_admin())
  with check (mentee_id = auth.uid() or mentor_id = auth.uid() or public.is_admin());

-- Replaces 0002's guard (which was security definer, so it could not tell a
-- trusted server write from a user request).
create or replace function public.guard_match_activation()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;

  if tg_op = 'INSERT' then
    -- The insert policy already pins status to 'requested'.
    return new;
  end if;

  if new.mentee_id is distinct from old.mentee_id
     or new.mentor_id is distinct from old.mentor_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Match participants cannot be changed.'
      using errcode = 'insufficient_privilege';
  end if;

  -- The mentor may accept, decline or end. The mentee may only withdraw/end.
  if new.status is distinct from old.status
     and auth.uid() is distinct from old.mentor_id
     and new.status <> 'ended' then
    raise exception 'Only the mentor can accept a match request.'
      using errcode = 'insufficient_privilege';
  end if;

  return new;
end;
$$;

-- ===========================================================================
-- 5. Mini-project submissions: mentees submit, mentors review
-- ===========================================================================
create or replace function public.guard_submission_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;

  if tg_op = 'UPDATE'
     and (new.project_id is distinct from old.project_id
          or new.mentee_id is distinct from old.mentee_id) then
    raise exception 'Submissions cannot be moved to another project or mentee.'
      using errcode = 'insufficient_privilege';
  end if;

  if new.mentee_id = auth.uid() then
    -- Mentee (re)submitting their own work.
    if tg_op = 'UPDATE' and old.status = 'approved' then
      raise exception 'This submission has already been approved.';
    end if;
    new.status := 'submitted';
    new.submitted_at := now();
    if tg_op = 'INSERT' then
      new.mentor_feedback := null;
      new.reviewed_by := null;
      new.reviewed_at := null;
    else
      new.mentor_feedback := old.mentor_feedback;
      new.reviewed_by := old.reviewed_by;
      new.reviewed_at := old.reviewed_at;
    end if;
    return new;
  end if;

  -- Anyone else reaching here is a reviewer (the update policy restricts
  -- that to approved mentors of the project's track). They may only set the
  -- verdict and feedback.
  if tg_op = 'INSERT'
     or new.repo_url is distinct from old.repo_url
     or new.demo_url is distinct from old.demo_url
     or new.notes is distinct from old.notes
     or new.submitted_at is distinct from old.submitted_at then
    raise exception 'Reviewers can only change the status and feedback.'
      using errcode = 'insufficient_privilege';
  end if;
  new.reviewed_by := auth.uid();
  new.reviewed_at := now();
  return new;
end;
$$;

drop trigger if exists mini_project_submissions_guard_write on public.mini_project_submissions;
create trigger mini_project_submissions_guard_write
  before insert or update on public.mini_project_submissions
  for each row execute function public.guard_submission_write();

drop policy if exists submissions_update_mentor on public.mini_project_submissions;

create policy submissions_update_mentor on public.mini_project_submissions
  for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.mini_projects mp
      where mp.id = mini_project_submissions.project_id
        and mp.track = public.current_mentor_track()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.mini_projects mp
      where mp.id = mini_project_submissions.project_id
        and mp.track = public.current_mentor_track()
    )
  );

-- ===========================================================================
-- 6. Certificates
-- ===========================================================================
alter table public.issued_certificates
  add column if not exists issued_by uuid references public.profiles (id) default auth.uid();

drop policy if exists issued_certificates_insert_mentor on public.issued_certificates;

create policy issued_certificates_insert_mentor on public.issued_certificates
  for insert with check (
    issued_by = auth.uid()
    and public.is_approved_mentor()
    and public.has_active_match(auth.uid(), mentee_id)
  );

drop policy if exists issued_certificates_select_mentor on public.issued_certificates;
create policy issued_certificates_select_mentor on public.issued_certificates
  for select using (
    issued_by = auth.uid() or public.has_active_match(auth.uid(), mentee_id)
  );

-- ===========================================================================
-- 7. Remaining write policies
-- ===========================================================================

-- Threads only between an actively matched mentor/mentee pair (or an admin).
drop policy if exists threads_insert_participant on public.message_threads;

create policy threads_insert_participant on public.message_threads
  for insert with check (
    participant_a <> participant_b
    and (participant_a = auth.uid() or participant_b = auth.uid())
    and (
      public.is_admin()
      or public.has_active_match(participant_a, participant_b)
      or public.has_active_match(participant_b, participant_a)
    )
  );

-- Sessions are created by approved mentors, for their own mentees.
drop policy if exists sessions_write_mentor on public.sessions;

create policy sessions_write_mentor on public.sessions
  for all
  using (mentor_id = auth.uid() or public.is_admin())
  with check (
    public.is_admin()
    or (
      mentor_id = auth.uid()
      and public.is_approved_mentor()
      and (mentee_id is null or public.has_active_match(auth.uid(), mentee_id))
    )
  );

-- PR reviews go to the mentee's own mentor.
drop policy if exists pr_reviews_insert_mentee on public.pr_reviews;

create policy pr_reviews_insert_mentee on public.pr_reviews
  for insert with check (
    mentee_id = auth.uid() and public.has_active_match(mentor_id, auth.uid())
  );

drop policy if exists pr_reviews_update_mentor on public.pr_reviews;

create policy pr_reviews_update_mentor on public.pr_reviews
  for update
  using (mentor_id = auth.uid() or public.is_admin())
  with check (mentor_id = auth.uid() or public.is_admin());

-- Milestones are set by the mentee's active mentor (or an admin); mentees
-- can read theirs but not mark them complete themselves.
drop policy if exists mentee_milestones_write on public.mentee_milestones;

create policy mentee_milestones_write on public.mentee_milestones
  for all
  using (
    public.is_admin()
    or (mentor_id = auth.uid() and public.has_active_match(auth.uid(), mentee_id))
  )
  with check (
    public.is_admin()
    or (mentor_id = auth.uid() and public.has_active_match(auth.uid(), mentee_id))
  );

-- Only approved mentors have directory metadata, and they can't award
-- themselves a rating or inflate their mentee count.
drop policy if exists mentor_meta_write_own on public.mentor_meta;

create policy mentor_meta_write_own on public.mentor_meta
  for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.is_approved_mentor());

create or replace function public.guard_mentor_meta_write()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_trusted_writer() then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.rating := 0;
    new.mentees_count := 0;
  else
    new.rating := old.rating;
    new.mentees_count := old.mentees_count;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists mentor_meta_guard_write on public.mentor_meta;
create trigger mentor_meta_guard_write
  before insert or update on public.mentor_meta
  for each row execute function public.guard_mentor_meta_write();
