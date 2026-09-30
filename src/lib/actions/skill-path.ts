"use server";

import { requireStaffClient, resolveTrack } from "./staff";

export interface SkillStepInput {
  /** Ignored for mentors — they always edit their own track's path. */
  track?: string;
  title: string;
  description?: string;
  timeframe?: string;
  resourceUrl?: string;
  prRequired?: boolean;
}

export async function createSkillStep(input: SkillStepInput) {
  const { supabase, userId, track: staffTrack } = await requireStaffClient();
  const track = resolveTrack(staffTrack, input.track);

  const { data: last } = await supabase
    .from("milestone_templates")
    .select("order_index")
    .eq("track", track)
    .order("order_index", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("milestone_templates").insert({
    track,
    title: input.title,
    description: input.description || null,
    due_label: input.timeframe || null,
    resource_url: input.resourceUrl || null,
    pr_required: input.prRequired ?? false,
    order_index: (last?.order_index ?? 0) + 1,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
}

export async function deleteSkillStep(id: string) {
  const { supabase } = await requireStaffClient();
  const { data, error } = await supabase.from("milestone_templates").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("You can only edit your own track's skill path.");
}

/** Swaps a step with its neighbour in the same track. */
export async function moveSkillStep(id: string, direction: "up" | "down") {
  const { supabase } = await requireStaffClient();

  const { data: step } = await supabase
    .from("milestone_templates")
    .select("id, track, order_index")
    .eq("id", id)
    .single();
  if (!step?.track) throw new Error("Step not found.");

  const base = supabase
    .from("milestone_templates")
    .select("id, order_index")
    .eq("track", step.track);
  const { data: neighbour } = await (direction === "up"
    ? base.lt("order_index", step.order_index)
    : base.gt("order_index", step.order_index)
  )
    .order("order_index", { ascending: direction === "down" })
    .limit(1)
    .maybeSingle();
  if (!neighbour) return;

  const results = await Promise.all([
    supabase.from("milestone_templates").update({ order_index: neighbour.order_index }).eq("id", step.id),
    supabase.from("milestone_templates").update({ order_index: step.order_index }).eq("id", neighbour.id),
  ]);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw new Error(failed.error.message);
}
