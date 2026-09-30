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

-- Remap every column that stores a track name. One DO block rather than a
-- temp table: the Supabase SQL editor may run each statement in a separate
-- session, where a temp table from an earlier statement no longer exists.
-- guard_profile_update lets the profiles updates through: this runs as a
-- trusted writer (not anon/authenticated).
do $$
declare
  r record;
begin
  for r in
    select * from (values
      ('Mobile', 'Mobile Dev'),
      ('Cloud', 'Backend'),
      ('DevOps', 'Backend'),
      ('AI', 'Backend')
    ) as v(old_name, new_name)
  loop
    update public.milestone_templates set track = r.new_name where track = r.old_name;
    update public.mini_projects set track = r.new_name where track = r.old_name;
    update public.certificate_templates set track = r.new_name where track = r.old_name;
    update public.issued_certificates set track = r.new_name where track = r.old_name;
    update public.quiz_submissions set recommended_track = r.new_name where recommended_track = r.old_name;
    update public.mentor_applications set specialization = r.new_name where specialization = r.old_name;
    update public.profiles set track = r.new_name where track = r.old_name;
    update public.profiles set specialization = r.new_name where specialization = r.old_name;
  end loop;
end;
$$;

delete from public.tracks where name in ('Mobile', 'Cloud', 'DevOps', 'AI');

commit;
