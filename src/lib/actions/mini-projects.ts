"use server";

import { requireStaffClient, resolveTrack } from "./staff";

export interface MiniProjectInput {
  /** Ignored for mentors — they always post to their own track. */
  track?: string;
  title: string;
  description?: string;
  weekNumber: number;
  dueAt?: string;
  resourceUrl?: string;
}

export async function createMiniProject(input: MiniProjectInput) {
  const { supabase, userId, track } = await requireStaffClient();
  const { error } = await supabase.from("mini_projects").insert({
    track: resolveTrack(track, input.track),
    title: input.title,
    description: input.description || null,
    week_number: input.weekNumber,
    due_at: input.dueAt || null,
    resource_url: input.resourceUrl || null,
    created_by: userId,
  });
  if (error) throw new Error(error.message);
}

export async function deleteMiniProject(id: string) {
  const { supabase } = await requireStaffClient();
  const { data, error } = await supabase.from("mini_projects").delete().eq("id", id).select("id");
  if (error) throw new Error(error.message);
  if (!data?.length) throw new Error("You can only remove projects in your own track.");
}
