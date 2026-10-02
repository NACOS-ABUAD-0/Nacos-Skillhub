-- NACOS Skills Hub — add DevOps as a skill track.
--
-- 0004 retired DevOps and remapped it to Backend; it is back as its own
-- track. Rows remapped back then stay on Backend — admins can move
-- individuals from the Users page.
--
-- Safe to re-run.

insert into public.tracks (name, color) values ('DevOps', '#2F6B8F')
on conflict (name) do update set color = excluded.color;
