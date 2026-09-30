-- NACOS Skills Hub — per-mentee progress on skill path steps.
--
-- A mentee_milestones row with a template_id records one mentee's status on
-- one roadmap step (set by their active mentor via the existing
-- mentee_milestones_write policy). One row per mentee per step, so the app
-- can upsert. Rows without a template_id (ad-hoc milestones) are unaffected:
-- nulls never collide in a unique constraint.
--
-- Safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'mentee_milestones_mentee_template_key'
  ) then
    -- Keep the most recently updated row if duplicates already exist.
    delete from public.mentee_milestones a
    using public.mentee_milestones b
    where a.template_id is not null
      and a.mentee_id = b.mentee_id
      and a.template_id = b.template_id
      and (a.updated_at, a.id) < (b.updated_at, b.id);

    alter table public.mentee_milestones
      add constraint mentee_milestones_mentee_template_key unique (mentee_id, template_id);
  end if;
end;
$$;

-- Deleting a roadmap step removes everyone's progress on it.
alter table public.mentee_milestones drop constraint if exists mentee_milestones_template_id_fkey;
alter table public.mentee_milestones
  add constraint mentee_milestones_template_id_fkey
  foreign key (template_id) references public.milestone_templates (id) on delete cascade;
