-- NACOS Skills Hub — replace the track list with the hub's skill tracks:
-- Mobile Dev, Cybersecurity, Frontend, Backend, UI/UX, Database (SQL), Fullstack.
--
-- Retired tracks (Cloud, DevOps, AI) are remapped to Backend everywhere they
-- are referenced so no mentor loses their review queue; admins can reassign
-- individuals afterwards. Safe to re-run.

begin;

-- Let renames flow through to rows that reference a track by name.
alter table public.milestone_templates drop constraint if exists milestone_templates_track_fkey;
alter table public.milestone_templates
  add constraint milestone_templates_track_fkey
  foreign key (track) references public.tracks (name) on update cascade;

alter table public.mini_projects drop constraint if exists mini_projects_track_fkey;
alter table public.mini_projects
  add constraint mini_projects_track_fkey
  foreign key (track) references public.tracks (name) on update cascade;

-- Rename kept tracks.
update public.tracks set name = 'Mobile Dev' where name = 'Mobile'
  and not exists (select 1 from public.tracks where name = 'Mobile Dev');

-- Add the new tracks.
insert into public.tracks (name, color) values
  ('Mobile Dev', '#3DDC84'),
  ('Cybersecurity', '#16452E'),
  ('Frontend', '#008751'),
  ('Backend', '#0E2E1F'),
  ('UI/UX', '#C89B3C'),
  ('Database (SQL)', '#4A7C59'),
  ('Fullstack', '#235F41')
on conflict (name) do update set color = excluded.color;

-- Plain-text track columns (no FK) — rename + remap retired tracks.
create temporary table track_remap (old_name text primary key, new_name text not null) on commit drop;
insert into track_remap values
  ('Mobile', 'Mobile Dev'),
  ('Cloud', 'Backend'),
  ('DevOps', 'Backend'),
  ('AI', 'Backend');

update public.milestone_templates t set track = r.new_name from track_remap r where t.track = r.old_name;
update public.mini_projects t set track = r.new_name from track_remap r where t.track = r.old_name;
update public.certificate_templates t set track = r.new_name from track_remap r where t.track = r.old_name;
update public.issued_certificates t set track = r.new_name from track_remap r where t.track = r.old_name;
update public.quiz_submissions t set recommended_track = r.new_name from track_remap r where t.recommended_track = r.old_name;
update public.mentor_applications t set specialization = r.new_name from track_remap r where t.specialization = r.old_name;

-- guard_profile_update lets this through: the migration runs as a trusted
-- writer (not anon/authenticated).
update public.profiles t set track = r.new_name from track_remap r where t.track = r.old_name;
update public.profiles t set specialization = r.new_name from track_remap r where t.specialization = r.old_name;

delete from public.tracks where name in ('Mobile', 'Cloud', 'DevOps', 'AI');

commit;
