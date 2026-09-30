-- Read-only account audit. Run in the Supabase SQL editor after applying
-- migration 0003. Nothing here modifies data — review the results, then
-- remove unwanted accounts from Authentication → Users in the dashboard
-- (deleting the auth user cascades to their profile and related rows).

-- 1. Every admin. Before 0003, anyone could self-register as admin by
--    passing { role: 'admin' } in signup metadata. Anyone here you don't
--    recognise should be demoted or deleted.
select p.id, p.email, p.full_name, p.created_at, u.last_sign_in_at
from public.profiles p
join auth.users u on u.id = p.id
where p.role = 'admin'
order by p.created_at;

-- 2. Approved mentors with no approved application — i.e. they were never
--    approved by an admin (self-granted via signup metadata or a direct
--    profile update).
select p.id, p.email, p.full_name, p.track, p.created_at
from public.profiles p
where p.role = 'mentor'
  and p.mentor_status = 'approved'
  and not exists (
    select 1 from public.mentor_applications a
    where a.user_id = p.id and a.status = 'approved' and a.reviewed_by is not null
  )
order by p.created_at;

-- 3. Mentor profiles whose status is 'none' (a mentee who flipped their own
--    role to 'mentor' — this got full mentor-desk access before 0003).
select p.id, p.email, p.full_name, p.created_at
from public.profiles p
where p.role = 'mentor' and p.mentor_status = 'none';

-- 4. Demo accounts. These use a password that was committed to the public
--    repo; if they exist in production, delete them (demo.admin is an admin).
select p.id, p.email, p.role, u.last_sign_in_at
from public.profiles p
join auth.users u on u.id = p.id
where p.email like 'demo.%@nacos.dev';

-- 5. Everyone, newest first, for a quick eyeball.
select p.email, p.full_name, p.matric_number, p.role, p.mentor_status, p.created_at,
       u.email_confirmed_at, u.last_sign_in_at
from public.profiles p
join auth.users u on u.id = p.id
order by p.created_at desc;

-- To demote someone instead of deleting them:
--   update public.profiles set role = 'mentee', mentor_status = 'none' where id = '<uuid>';
