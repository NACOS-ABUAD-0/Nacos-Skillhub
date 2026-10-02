"use server";

import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/auth/types";

const ROLES: UserRole[] = ["mentee", "mentor", "admin"];

/**
 * Admin-only: change a user's role and/or track. Admins are trusted writers
 * (see is_trusted_writer), so guard_profile_update lets these through.
 */
export async function updateUserRole(userId: string, role: UserRole, track?: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated.");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") throw new Error("Not authorized.");
  if (!ROLES.includes(role)) throw new Error("Unknown role.");
  if (userId === user.id && role !== "admin") {
    throw new Error("You can't remove your own admin role — ask another admin.");
  }

  const { data: target, error: fetchError } = await supabase
    .from("profiles")
    .select("track")
    .eq("id", userId)
    .single();
  if (fetchError || !target) throw new Error(fetchError?.message ?? "User not found.");

  const nextTrack = track || target.track;
  // Mentors review and author content for their track, so they need one.
  if (role === "mentor" && !nextTrack) throw new Error("Choose a track for this mentor.");

  const { error } = await supabase
    .from("profiles")
    .update({
      role,
      // Promoting to mentor here is an admin decision, so skip the application flow.
      mentor_status: role === "mentor" ? "approved" : "none",
      track: nextTrack,
      ...(role === "mentor" ? { specialization: nextTrack } : {}),
    })
    .eq("id", userId);
  if (error) throw new Error(error.message);
}
