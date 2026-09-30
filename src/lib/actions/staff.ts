import { createClient } from "@/lib/supabase/server";

/**
 * Server-side check for actions that admins and approved mentors share.
 * Mentors are pinned to their own track (`track`); admins get `track: null`
 * and may write to any track. RLS enforces the same rules in the database.
 */
export async function requireStaffClient() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, mentor_status, track")
    .eq("id", user.id)
    .single();

  if (profile?.role === "admin") {
    return { supabase, userId: user.id, track: null as string | null };
  }
  if (profile?.role === "mentor" && profile.mentor_status === "approved") {
    if (!profile.track) throw new Error("Ask an admin to assign your mentoring track first.");
    return { supabase, userId: user.id, track: profile.track as string | null };
  }
  throw new Error("Not authorized.");
}

/** Mentors always write to their own track; admins must name one. */
export function resolveTrack(staffTrack: string | null, requested: string | undefined): string {
  const track = staffTrack ?? requested;
  if (!track) throw new Error("Choose a track.");
  return track;
}
