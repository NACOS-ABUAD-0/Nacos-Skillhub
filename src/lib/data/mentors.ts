import { createClient } from "@/lib/supabase/client";
import type { Availability } from "@/lib/supabase/database.types";

export interface MentorDirectoryEntry {
  id: string;
  name: string;
  level: string;
  track: string;
  rating: number;
  mentees: number;
  availability: Availability;
  tags: string[];
  bio: string;
}

/** Approved mentors, merged with their public mentor_meta (if any). */
export async function fetchMentorDirectory(): Promise<MentorDirectoryEntry[]> {
  const supabase = createClient();
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, level, track, bio")
    .eq("role", "mentor")
    .eq("mentor_status", "approved");

  if (!profiles?.length) return [];

  const { data: meta } = await supabase
    .from("mentor_meta")
    .select("*")
    .in(
      "user_id",
      profiles.map((p) => p.id)
    );
  const metaMap = new Map((meta ?? []).map((m) => [m.user_id, m]));

  return profiles.map((p) => {
    const m = metaMap.get(p.id);
    return {
      id: p.id,
      name: p.full_name,
      level: p.level ?? "—",
      track: p.track ?? "—",
      rating: m?.rating ?? 0,
      mentees: m?.mentees_count ?? 0,
      availability: m?.availability ?? "Open",
      tags: m?.tags ?? [],
      bio: m?.headline ?? p.bio ?? "No bio yet.",
    };
  });
}

/** Mentor ids this mentee already has a match row with (any status). */
export async function fetchMatchedMentorIds(menteeId: string): Promise<Set<string>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("mentee_mentor_matches")
    .select("mentor_id")
    .eq("mentee_id", menteeId);
  return new Set((data ?? []).map((m) => m.mentor_id));
}

/**
 * Files a match request. Insert-only: an upsert here would reset an existing
 * active match back to "requested".
 */
export async function requestMentorMatch(menteeId: string, mentorId: string): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("mentee_mentor_matches")
    .upsert(
      { mentee_id: menteeId, mentor_id: mentorId, status: "requested" },
      { onConflict: "mentee_id,mentor_id", ignoreDuplicates: true }
    );
  return error?.message ?? null;
}
