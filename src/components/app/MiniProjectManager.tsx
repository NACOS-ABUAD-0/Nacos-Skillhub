"use client";

import { useCallback, useEffect, useState } from "react";
import {
  SoftPanel,
  FilterBar,
  SoftInput,
  SoftSelect,
  SoftButton,
  StatusBadge,
  EmptyState,
} from "@/components/app/ui";
import { createClient } from "@/lib/supabase/client";
import { createMiniProject, deleteMiniProject } from "@/lib/actions/mini-projects";
import { useTracks } from "@/lib/data/tracks";
import type { Database } from "@/lib/supabase/database.types";

type MiniProject = Database["public"]["Tables"]["mini_projects"]["Row"];

/**
 * Create/remove weekly mini-projects. Admins pick any track; mentors pass
 * `fixedTrack` and only see and post to their own track.
 */
export function MiniProjectManager({ fixedTrack }: { fixedTrack?: string }) {
  const tracks = useTracks();
  const [projects, setProjects] = useState<MiniProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [track, setTrack] = useState(fixedTrack ?? "");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [weekNumber, setWeekNumber] = useState(1);
  const [dueAt, setDueAt] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    let query = supabase.from("mini_projects").select("*");
    if (fixedTrack) query = query.eq("track", fixedTrack);
    const { data } = await query.order("track").order("week_number");
    setProjects(data ?? []);
    setLoading(false);
  }, [fixedTrack]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!track && tracks.length) setTrack(tracks[0].name);
  }, [track, tracks]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!track || !title.trim()) return;
    setError("");
    setSaving(true);
    try {
      await createMiniProject({
        track,
        title: title.trim(),
        description: description.trim() || undefined,
        weekNumber,
        dueAt: dueAt ? new Date(dueAt).toISOString() : undefined,
        resourceUrl: resourceUrl.trim() || undefined,
      });
      setTitle("");
      setDescription("");
      setResourceUrl("");
      setWeekNumber((w) => w + 1);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    setError("");
    try {
      await deleteMiniProject(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove project.");
    }
  };

  return (
    <div className="space-y-5">
      <FilterBar>
        <form onSubmit={add} className="grid w-full gap-3 sm:grid-cols-2 xl:grid-cols-6">
          <div className="space-y-1.5 xl:col-span-1">
            <label className="text-xs font-medium text-ink/45">Track</label>
            {fixedTrack ? (
              <SoftInput value={fixedTrack} disabled />
            ) : (
              <SoftSelect value={track} onChange={(e) => setTrack(e.target.value)}>
                {tracks.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </SoftSelect>
            )}
          </div>
          <div className="space-y-1.5 xl:col-span-1">
            <label className="text-xs font-medium text-ink/45">Week</label>
            <SoftInput
              type="number"
              min={1}
              value={weekNumber}
              onChange={(e) => setWeekNumber(Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5 xl:col-span-2">
            <label className="text-xs font-medium text-ink/45">Title</label>
            <SoftInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Build a REST API" />
          </div>
          <div className="space-y-1.5 xl:col-span-1">
            <label className="text-xs font-medium text-ink/45">Due date</label>
            <SoftInput type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} />
          </div>
          <div className="flex items-end xl:col-span-1">
            <SoftButton type="submit" className="w-full" disabled={saving || !title.trim()}>
              {saving ? "Adding…" : "Add project"}
            </SoftButton>
          </div>
          <div className="space-y-1.5 sm:col-span-2 xl:col-span-4">
            <label className="text-xs font-medium text-ink/45">Description</label>
            <SoftInput
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What mentees should build and submit"
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2 xl:col-span-2">
            <label className="text-xs font-medium text-ink/45">Resource link (optional)</label>
            <SoftInput
              value={resourceUrl}
              onChange={(e) => setResourceUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </form>
      </FilterBar>

      {error && (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {!loading && projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description={
            fixedTrack
              ? `Add this week's ${fixedTrack} project above.`
              : "Add this week's project per track above."
          }
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((p) => (
            <SoftPanel
              key={p.id}
              title={p.title}
              subtitle={`${p.track} · Week ${p.week_number}`}
              actions={<StatusBadge tone="info">{p.track}</StatusBadge>}
            >
              {p.description && <p className="text-sm text-ink/60">{p.description}</p>}
              {p.due_at && (
                <p className="mt-2 text-xs text-ink/40">
                  Due {new Date(p.due_at).toLocaleDateString()}
                </p>
              )}
              <button
                type="button"
                onClick={() => remove(p.id)}
                className="mt-4 text-xs font-semibold text-red-700 hover:underline"
              >
                Remove
              </button>
            </SoftPanel>
          ))}
        </div>
      )}
    </div>
  );
}
