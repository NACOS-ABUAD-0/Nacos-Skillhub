-- One-off catch-up for a database set up from an older 0001_init.sql.
-- Creates whatever tables / policies / helpers from 0001 and 0002 are
-- missing, skipping anything that already exists. Safe to re-run.
--
-- Leaves out 0001's handle_new_user signup trigger on purpose: your database
-- already has one, and the old version is the insecure one 0003 replaces.
--
-- Run this, then run 0003_security_hardening.sql straight after — this
-- script restores 0001's looser policies until 0003 tightens them.


-- ===========================================================================
-- profiles — 1:1 with auth.users
-- ===========================================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null unique,
  full_name text not null default '',
  matric_number text not null default '',
  role text not null default 'mentee' check (role in ('mentee', 'mentor', 'admin')),
  mentor_status text not null default 'none'
    check (mentor_status in ('none', 'pending', 'approved', 'rejected')),
  level text,
  specialization text,
  track text,
  bio text,
  avatar_initials text,
  created_at timestamptz not null default now()
);

-- ===========================================================================
-- Helper: is the current JWT's user an admin?
-- security definer so it can read `profiles` regardless of the caller's RLS.
-- Must come after `profiles` exists — `language sql` functions are validated
-- against real objects at CREATE time (check_function_bodies), not deferred
-- to first call like plpgsql.
-- ===========================================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

alter table public.profiles enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own on public.profiles
  for select using (id = auth.uid());

drop policy if exists profiles_select_admin on public.profiles;
create policy profiles_select_admin on public.profiles
  for select using (public.is_admin());

-- Anyone signed in can see the public mentor directory fields (approved mentors).
drop policy if exists profiles_select_approved_mentors on public.profiles;
create policy profiles_select_approved_mentors on public.profiles
  for select using (role = 'mentor' and mentor_status = 'approved');

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid())
  with check (
    id = auth.uid()
    and role <> 'admin'
    and mentor_status <> 'approved'
    and mentor_status <> 'rejected'
  );

drop policy if exists profiles_update_admin on public.profiles;
create policy profiles_update_admin on public.profiles
  for update using (public.is_admin())
  with check (public.is_admin());

-- ===========================================================================
-- tracks
-- ===========================================================================
create table if not exists public.tracks (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  color text,
  created_at timestamptz not null default now()
);

alter table public.tracks enable row level security;

-- Public: the signup and mentor-apply forms need the track list before login.
drop policy if exists tracks_select_all on public.tracks;
create policy tracks_select_all on public.tracks
  for select using (true);

drop policy if exists tracks_write_admin on public.tracks;
create policy tracks_write_admin on public.tracks
  for all using (public.is_admin()) with check (public.is_admin());

insert into public.tracks (name, color) values
  ('Cybersecurity', '#16452E'),
  ('Cloud', '#008751'),
  ('DevOps', '#C89B3C'),
  ('Fullstack', '#235F41'),
  ('Mobile', '#3DDC84'),
  ('AI', '#0E2E1F')
on conflict (name) do nothing;

-- ===========================================================================
-- mentor_applications
-- ===========================================================================
create table if not exists public.mentor_applications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  full_name text not null,
  email text not null,
  matric_number text not null,
  level text not null,
  specialization text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz
);

alter table public.mentor_applications enable row level security;

drop policy if exists mentor_applications_select_own on public.mentor_applications;
create policy mentor_applications_select_own on public.mentor_applications
  for select using (user_id = auth.uid());

drop policy if exists mentor_applications_select_admin on public.mentor_applications;
create policy mentor_applications_select_admin on public.mentor_applications
  for select using (public.is_admin());

drop policy if exists mentor_applications_insert_own on public.mentor_applications;
create policy mentor_applications_insert_own on public.mentor_applications
  for insert with check (user_id = auth.uid());

drop policy if exists mentor_applications_update_admin on public.mentor_applications;
create policy mentor_applications_update_admin on public.mentor_applications
  for update using (public.is_admin()) with check (public.is_admin());


-- ===========================================================================
-- mentor_meta — public-directory extras for approved mentors
-- ===========================================================================
create table if not exists public.mentor_meta (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  rating numeric(2, 1) default 0,
  mentees_count int not null default 0,
  availability text not null default 'Open' check (availability in ('Open', 'Limited', 'Full')),
  tags text[] not null default '{}',
  headline text,
  updated_at timestamptz not null default now()
);

alter table public.mentor_meta enable row level security;

drop policy if exists mentor_meta_select_all on public.mentor_meta;
create policy mentor_meta_select_all on public.mentor_meta
  for select using (auth.uid() is not null);

drop policy if exists mentor_meta_write_own on public.mentor_meta;
create policy mentor_meta_write_own on public.mentor_meta
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists mentor_meta_write_admin on public.mentor_meta;
create policy mentor_meta_write_admin on public.mentor_meta
  for all using (public.is_admin()) with check (public.is_admin());

-- ===========================================================================
-- mentee_mentor_matches
-- ===========================================================================
create table if not exists public.mentee_mentor_matches (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  match_score int,
  status text not null default 'requested' check (status in ('requested', 'active', 'ended')),
  created_at timestamptz not null default now(),
  unique (mentee_id, mentor_id)
);

alter table public.mentee_mentor_matches enable row level security;

drop policy if exists matches_select_participant on public.mentee_mentor_matches;
create policy matches_select_participant on public.mentee_mentor_matches
  for select using (mentee_id = auth.uid() or mentor_id = auth.uid() or public.is_admin());

drop policy if exists matches_insert_mentee on public.mentee_mentor_matches;
create policy matches_insert_mentee on public.mentee_mentor_matches
  for insert with check (mentee_id = auth.uid() or public.is_admin());

drop policy if exists matches_update_participant on public.mentee_mentor_matches;
create policy matches_update_participant on public.mentee_mentor_matches
  for update using (mentee_id = auth.uid() or mentor_id = auth.uid() or public.is_admin());

-- ===========================================================================
-- quiz_submissions
-- ===========================================================================
create table if not exists public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references public.profiles (id) on delete cascade,
  answers jsonb not null,
  recommended_track text not null,
  submitted_at timestamptz not null default now()
);

alter table public.quiz_submissions enable row level security;

drop policy if exists quiz_select_own on public.quiz_submissions;
create policy quiz_select_own on public.quiz_submissions
  for select using (mentee_id = auth.uid() or public.is_admin());

drop policy if exists quiz_insert_own on public.quiz_submissions;
create policy quiz_insert_own on public.quiz_submissions
  for insert with check (mentee_id = auth.uid());

-- ===========================================================================
-- milestone_templates + mentee_milestones
-- ===========================================================================
create table if not exists public.milestone_templates (
  id uuid primary key default gen_random_uuid(),
  track text references public.tracks (name),
  title text not null,
  description text,
  order_index int not null default 0,
  due_label text,
  pr_required boolean not null default false
);

alter table public.milestone_templates enable row level security;

drop policy if exists milestone_templates_select_all on public.milestone_templates;
create policy milestone_templates_select_all on public.milestone_templates
  for select using (auth.uid() is not null);

drop policy if exists milestone_templates_write_admin on public.milestone_templates;
create policy milestone_templates_write_admin on public.milestone_templates
  for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.mentee_milestones (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid references public.profiles (id),
  template_id uuid references public.milestone_templates (id),
  title text not null,
  description text,
  status text not null default 'locked' check (status in ('locked', 'current', 'completed')),
  due_label text,
  pr_required boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.mentee_milestones enable row level security;

drop policy if exists mentee_milestones_select on public.mentee_milestones;
create policy mentee_milestones_select on public.mentee_milestones
  for select using (mentee_id = auth.uid() or mentor_id = auth.uid() or public.is_admin());

drop policy if exists mentee_milestones_write on public.mentee_milestones;
create policy mentee_milestones_write on public.mentee_milestones
  for all using (mentee_id = auth.uid() or mentor_id = auth.uid() or public.is_admin())
  with check (mentee_id = auth.uid() or mentor_id = auth.uid() or public.is_admin());

-- ===========================================================================
-- certificate_templates + issued_certificates
-- ===========================================================================
create table if not exists public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  track text,
  description text
);

alter table public.certificate_templates enable row level security;

drop policy if exists certificate_templates_select_all on public.certificate_templates;
create policy certificate_templates_select_all on public.certificate_templates
  for select using (auth.uid() is not null);

drop policy if exists certificate_templates_write_admin on public.certificate_templates;
create policy certificate_templates_write_admin on public.certificate_templates
  for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.issued_certificates (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references public.profiles (id) on delete cascade,
  template_id uuid references public.certificate_templates (id),
  title text not null,
  track text,
  signed_by text,
  issued_at timestamptz not null default now()
);

alter table public.issued_certificates enable row level security;

drop policy if exists issued_certificates_select on public.issued_certificates;
create policy issued_certificates_select on public.issued_certificates
  for select using (mentee_id = auth.uid() or public.is_admin());

drop policy if exists issued_certificates_write_admin on public.issued_certificates;
create policy issued_certificates_write_admin on public.issued_certificates
  for all using (public.is_admin()) with check (public.is_admin());

-- An approved mentor can sign a certificate for a mentee in their own track.
drop policy if exists issued_certificates_insert_mentor on public.issued_certificates;
create policy issued_certificates_insert_mentor on public.issued_certificates
  for insert with check (
    exists (
      select 1 from public.profiles mentee
      join public.profiles mentor on mentor.id = auth.uid()
      where mentee.id = issued_certificates.mentee_id
        and mentor.role = 'mentor'
        and mentor.mentor_status = 'approved'
        and mentor.track = mentee.track
    )
  );

-- ===========================================================================
-- message_threads + messages
-- ===========================================================================
create table if not exists public.message_threads (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles (id) on delete cascade,
  participant_b uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (participant_a, participant_b)
);

alter table public.message_threads enable row level security;

drop policy if exists threads_select_participant on public.message_threads;
create policy threads_select_participant on public.message_threads
  for select using (participant_a = auth.uid() or participant_b = auth.uid() or public.is_admin());

drop policy if exists threads_insert_participant on public.message_threads;
create policy threads_insert_participant on public.message_threads
  for insert with check (participant_a = auth.uid() or participant_b = auth.uid());

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.message_threads (id) on delete cascade,
  sender_id uuid not null references public.profiles (id),
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

alter table public.messages enable row level security;

drop policy if exists messages_select_participant on public.messages;
create policy messages_select_participant on public.messages
  for select using (
    exists (
      select 1 from public.message_threads t
      where t.id = messages.thread_id
        and (t.participant_a = auth.uid() or t.participant_b = auth.uid())
    ) or public.is_admin()
  );

drop policy if exists messages_insert_participant on public.messages;
create policy messages_insert_participant on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.message_threads t
      where t.id = messages.thread_id
        and (t.participant_a = auth.uid() or t.participant_b = auth.uid())
    )
  );

-- ===========================================================================
-- sessions
-- ===========================================================================
create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  mentee_id uuid references public.profiles (id) on delete cascade,
  title text not null,
  scheduled_at timestamptz,
  mode text not null default 'Async' check (mode in ('Async', 'Live call', 'Office hours')),
  status text not null default 'Upcoming' check (status in ('Upcoming', 'Completed')),
  created_at timestamptz not null default now()
);

alter table public.sessions enable row level security;

drop policy if exists sessions_select_participant on public.sessions;
create policy sessions_select_participant on public.sessions
  for select using (mentor_id = auth.uid() or mentee_id = auth.uid() or public.is_admin());

drop policy if exists sessions_write_mentor on public.sessions;
create policy sessions_write_mentor on public.sessions
  for all using (mentor_id = auth.uid() or public.is_admin())
  with check (mentor_id = auth.uid() or public.is_admin());

-- ===========================================================================
-- pr_reviews
-- ===========================================================================
create table if not exists public.pr_reviews (
  id uuid primary key default gen_random_uuid(),
  mentee_id uuid not null references public.profiles (id) on delete cascade,
  mentor_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  repo_url text not null,
  priority text not null default 'Normal' check (priority in ('High', 'Normal')),
  status text not null default 'Pending' check (status in ('Pending', 'In review', 'Done')),
  submitted_at timestamptz not null default now()
);

alter table public.pr_reviews enable row level security;

drop policy if exists pr_reviews_select_participant on public.pr_reviews;
create policy pr_reviews_select_participant on public.pr_reviews
  for select using (mentee_id = auth.uid() or mentor_id = auth.uid() or public.is_admin());

drop policy if exists pr_reviews_insert_mentee on public.pr_reviews;
create policy pr_reviews_insert_mentee on public.pr_reviews
  for insert with check (mentee_id = auth.uid());

drop policy if exists pr_reviews_update_mentor on public.pr_reviews;
create policy pr_reviews_update_mentor on public.pr_reviews
  for update using (mentor_id = auth.uid() or public.is_admin());

-- ===========================================================================
-- mini_projects + mini_project_submissions (weekly per-track challenges)
-- ===========================================================================
create table if not exists public.mini_projects (
  id uuid primary key default gen_random_uuid(),
  track text not null references public.tracks (name),
  title text not null,
  description text,
  week_number int not null,
  opens_at timestamptz,
  due_at timestamptz,
  resource_url text,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

alter table public.mini_projects enable row level security;

drop policy if exists mini_projects_select_all on public.mini_projects;
create policy mini_projects_select_all on public.mini_projects
  for select using (auth.uid() is not null);

drop policy if exists mini_projects_write_admin on public.mini_projects;
create policy mini_projects_write_admin on public.mini_projects
  for all using (public.is_admin()) with check (public.is_admin());

create table if not exists public.mini_project_submissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.mini_projects (id) on delete cascade,
  mentee_id uuid not null references public.profiles (id) on delete cascade,
  repo_url text not null,
  demo_url text,
  notes text,
  status text not null default 'submitted' check (status in ('submitted', 'changes_requested', 'approved')),
  mentor_feedback text,
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  unique (project_id, mentee_id)
);

alter table public.mini_project_submissions enable row level security;

drop policy if exists submissions_select_own on public.mini_project_submissions;
create policy submissions_select_own on public.mini_project_submissions
  for select using (mentee_id = auth.uid() or public.is_admin());

drop policy if exists submissions_select_mentor on public.mini_project_submissions;
create policy submissions_select_mentor on public.mini_project_submissions
  for select using (
    exists (
      select 1 from public.mini_projects mp
      join public.profiles pm on pm.id = auth.uid()
      where mp.id = mini_project_submissions.project_id
        and pm.role = 'mentor'
        and pm.mentor_status = 'approved'
        and pm.track = mp.track
    )
  );

drop policy if exists submissions_insert_own on public.mini_project_submissions;
create policy submissions_insert_own on public.mini_project_submissions
  for insert with check (mentee_id = auth.uid());

drop policy if exists submissions_update_own on public.mini_project_submissions;
create policy submissions_update_own on public.mini_project_submissions
  for update using (mentee_id = auth.uid())
  with check (mentee_id = auth.uid());

drop policy if exists submissions_update_mentor on public.mini_project_submissions;
create policy submissions_update_mentor on public.mini_project_submissions
  for update using (
    public.is_admin()
    or exists (
      select 1 from public.mini_projects mp
      join public.profiles pm on pm.id = auth.uid()
      where mp.id = mini_project_submissions.project_id
        and pm.role = 'mentor'
        and pm.mentor_status = 'approved'
        and pm.track = mp.track
    )
  );

-- ---- from 0002_match_visibility.sql ----
-- ===========================================================================
-- Match participants can see each other's profile.
-- Without this, a mentor can read the match row but not the mentee's
-- profile (profiles RLS only exposes own/admin/approved mentors), so the
-- mentee shows up as "Unknown".
-- ===========================================================================
drop policy if exists profiles_select_match_participants on public.profiles;
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

drop trigger if exists mentee_mentor_matches_guard_activation on public.mentee_mentor_matches;
create trigger mentee_mentor_matches_guard_activation
  before insert or update on public.mentee_mentor_matches
  for each row execute function public.guard_match_activation();
