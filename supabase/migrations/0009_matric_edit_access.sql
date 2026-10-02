-- NACOS Skills Hub — matric / JAMB number edit access.
--
-- 100L students sign up with their JAMB registration number because they do
-- not have a matric number yet. Once they get one, their mentor unlocks the
-- field and the mentee updates it themselves. Saving a new number re-locks it.
--
-- Safe to re-run.

alter table public.profiles
  add column if not exists matric_edit_unlocked boolean not null default false;

-- Same guard as 0003, plus the matric number rules.
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

  -- Only a mentor (via set_matric_edit_access) or an admin can unlock.
  if new.matric_edit_unlocked and not old.matric_edit_unlocked then
    raise exception 'Ask your mentor to unlock your matric number.'
      using errcode = 'insufficient_privilege';
  end if;

  if new.matric_number is distinct from old.matric_number then
    if not old.matric_edit_unlocked then
      raise exception 'Ask your mentor to unlock your matric number.'
        using errcode = 'insufficient_privilege';
    end if;
    if coalesce(trim(new.matric_number), '') = '' then
      raise exception 'Matric number cannot be empty.';
    end if;
    new.matric_number := left(trim(new.matric_number), 40);
    -- One change per unlock.
    new.matric_edit_unlocked := false;
  end if;

  return new;
end;
$$;

-- Mentors may lock or unlock matric edits for mentees they have an active
-- match with. Runs as the owner so the guard treats it as a trusted write.
create or replace function public.set_matric_edit_access(p_mentee uuid, p_unlocked boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not (public.is_admin()
          or (public.is_approved_mentor(auth.uid())
              and public.has_active_match(auth.uid(), p_mentee))) then
    raise exception 'You can only manage access for your active mentees.'
      using errcode = 'insufficient_privilege';
  end if;

  update public.profiles
     set matric_edit_unlocked = coalesce(p_unlocked, false)
   where id = p_mentee;
end;
$$;

revoke execute on function public.set_matric_edit_access(uuid, boolean) from public, anon;
grant execute on function public.set_matric_edit_access(uuid, boolean) to authenticated;
