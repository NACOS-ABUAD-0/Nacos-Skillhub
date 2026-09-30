import { createClient } from "@/lib/supabase/client";
import type { MatchStatus } from "@/lib/supabase/database.types";
import { fetchSkillPaths, fetchStepProgress, summarizePath } from "@/lib/data/skill-path";

export interface AssignedMentee {
  id: string;
  name: string;
  level: string;
  track: string;
  progress: number;
  nextMilestone: string;
  matchStatus: MatchStatus;
}

/** Mentees matched to this mentor (any match status), with skill path progress. */
export async function fetchAssignedMentees(mentorId: string): Promise<AssignedMentee[]> {
  const supabase = createClient();
  const { data: matches } = await supabase
    .from("mentee_mentor_matches")
    .select("mentee_id, status")
    .eq("mentor_id", mentorId);

  if (!matches?.length) return [];

  const menteeIds = matches.map((m) => m.mentee_id);
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, level, track")
    .in("id", menteeIds);

  const tracks = [...new Set((profiles ?? []).map((p) => p.track).filter((t): t is string => !!t))];
  const [paths, progress] = await Promise.all([fetchSkillPaths(tracks), fetchStepProgress(menteeIds)]);

  return matches.map((match) => {
    const profile = profiles?.find((p) => p.id === match.mentee_id);
    const summary = summarizePath(
      (profile?.track && paths.get(profile.track)) || [],
      progress.get(match.mentee_id)
    );
    return {
      id: match.mentee_id,
      name: profile?.full_name ?? "Unknown",
      level: profile?.level ?? "—",
      track: profile?.track ?? "—",
      progress: summary.percent,
      nextMilestone: summary.next?.title ?? "—",
      matchStatus: match.status,
    };
  });
}

/** Mentor accepts (active) or declines (ended) a match request. */
export async function setMatchStatus(
  mentorId: string,
  menteeId: string,
  status: MatchStatus
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase
    .from("mentee_mentor_matches")
    .update({ status })
    .eq("mentor_id", mentorId)
    .eq("mentee_id", menteeId);
  return error?.message ?? null;
}
