import { createClient } from "@/lib/supabase/client";
import type { Database, MilestoneStatus } from "@/lib/supabase/database.types";

export type SkillStep = Database["public"]["Tables"]["milestone_templates"]["Row"];

/** Step id → this mentee's status on it. Missing means not started. */
export type StepProgress = Map<string, MilestoneStatus>;

/** A track's roadmap, in the order mentors arranged it. */
export async function fetchSkillPath(track: string): Promise<SkillStep[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("milestone_templates")
    .select("*")
    .eq("track", track)
    .order("order_index")
    .order("created_at");
  return data ?? [];
}

/** Roadmaps for several tracks at once, keyed by track. */
export async function fetchSkillPaths(tracks: string[]): Promise<Map<string, SkillStep[]>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("milestone_templates")
    .select("*")
    .in("track", tracks)
    .order("order_index")
    .order("created_at");
  const byTrack = new Map<string, SkillStep[]>();
  for (const step of data ?? []) {
    if (!step.track) continue;
    byTrack.set(step.track, [...(byTrack.get(step.track) ?? []), step]);
  }
  return byTrack;
}

/** Progress for one or more mentees, keyed by mentee id. */
export async function fetchStepProgress(menteeIds: string[]): Promise<Map<string, StepProgress>> {
  const supabase = createClient();
  const { data } = await supabase
    .from("mentee_milestones")
    .select("mentee_id, template_id, status")
    .in("mentee_id", menteeIds)
    .not("template_id", "is", null);
  const byMentee = new Map<string, StepProgress>();
  for (const row of data ?? []) {
    const progress = byMentee.get(row.mentee_id) ?? new Map();
    progress.set(row.template_id as string, row.status);
    byMentee.set(row.mentee_id, progress);
  }
  return byMentee;
}

/** Mentor records a mentee's status on a roadmap step. */
export async function setStepStatus(
  mentorId: string,
  menteeId: string,
  step: SkillStep,
  status: MilestoneStatus
): Promise<string | null> {
  const supabase = createClient();
  const { error } = await supabase.from("mentee_milestones").upsert(
    {
      mentee_id: menteeId,
      mentor_id: mentorId,
      template_id: step.id,
      title: step.title,
      description: step.description,
      due_label: step.due_label,
      pr_required: step.pr_required,
      status,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "mentee_id,template_id" }
  );
  return error?.message ?? null;
}

export interface PathSummary {
  completed: number;
  total: number;
  percent: number;
  /** The step marked in progress, else the first one not yet completed. */
  next: SkillStep | null;
}

export function summarizePath(steps: SkillStep[], progress: StepProgress | undefined): PathSummary {
  const completed = steps.filter((s) => progress?.get(s.id) === "completed").length;
  const next =
    steps.find((s) => progress?.get(s.id) === "current") ??
    steps.find((s) => progress?.get(s.id) !== "completed") ??
    null;
  return {
    completed,
    total: steps.length,
    percent: steps.length ? Math.round((completed / steps.length) * 100) : 0,
    next,
  };
}
