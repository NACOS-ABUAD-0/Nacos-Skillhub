-- NACOS Skills Hub — add Machine Learning as a skill track.
--
-- Safe to re-run.

insert into public.tracks (name, color) values ('Machine Learning', '#7A4FA3')
on conflict (name) do update set color = excluded.color;
