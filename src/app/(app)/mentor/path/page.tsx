"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import {
  PageShell,
  SoftPanel,
  SoftInput,
  SoftButton,
  EmptyState,
} from "@/components/app/ui";
import { SkillRoadmap } from "@/components/app/SkillRoadmap";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchSkillPath, type SkillStep } from "@/lib/data/skill-path";
import { createSkillStep, deleteSkillStep, moveSkillStep } from "@/lib/actions/skill-path";

export default function MentorSkillPathPage() {
  const { user } = useAuth();
  const track = user?.track;
  const [steps, setSteps] = useState<SkillStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timeframe, setTimeframe] = useState("");
  const [resourceUrl, setResourceUrl] = useState("");
  const [prRequired, setPrRequired] = useState(false);

  const load = useCallback(async () => {
    if (!track) return;
    setSteps(await fetchSkillPath(track));
    setLoading(false);
  }, [track]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async (action: () => Promise<void>, fallback: string) => {
    setError("");
    setBusy(true);
    try {
      await action();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  };

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    run(async () => {
      await createSkillStep({
        title: title.trim(),
        description: description.trim() || undefined,
        timeframe: timeframe.trim() || undefined,
        resourceUrl: resourceUrl.trim() || undefined,
        prRequired,
      });
      setTitle("");
      setDescription("");
      setTimeframe("");
      setResourceUrl("");
      setPrRequired(false);
    }, "Failed to add step.");
  };

  if (!track) {
    return (
      <PageShell title="Skill path" description="The roadmap mentees in your track follow.">
        <EmptyState
          title="No track assigned"
          description="Ask an admin to assign your mentoring track before building a skill path."
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title={`${track} skill path`}
      description="Lay out, step by step, what mentees in your track will learn. Every mentee in the track sees this roadmap."
    >
      <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
        <SoftPanel title="Roadmap" subtitle={`${steps.length} steps`}>
          {!loading && steps.length === 0 ? (
            <EmptyState
              title="No steps yet"
              description="Add the first thing mentees should learn — e.g. “Git & GitHub basics”."
            />
          ) : (
            <SkillRoadmap
              steps={steps}
              renderActions={(step, i) => (
                <>
                  <SoftButton
                    variant="ghost"
                    className="h-8 w-8 px-0"
                    aria-label="Move up"
                    disabled={busy || i === 0}
                    onClick={() => run(() => moveSkillStep(step.id, "up"), "Failed to reorder.")}
                  >
                    <ArrowUp className="h-4 w-4" />
                  </SoftButton>
                  <SoftButton
                    variant="ghost"
                    className="h-8 w-8 px-0"
                    aria-label="Move down"
                    disabled={busy || i === steps.length - 1}
                    onClick={() => run(() => moveSkillStep(step.id, "down"), "Failed to reorder.")}
                  >
                    <ArrowDown className="h-4 w-4" />
                  </SoftButton>
                  <SoftButton
                    variant="ghost"
                    className="h-8 w-8 px-0 text-red-700"
                    aria-label="Remove step"
                    disabled={busy}
                    onClick={() => {
                      if (confirm(`Remove “${step.title}” from the skill path?`)) {
                        run(() => deleteSkillStep(step.id), "Failed to remove step.");
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </SoftButton>
                </>
              )}
            />
          )}
        </SoftPanel>

        <SoftPanel title="Add a step" subtitle="New steps go to the end of the roadmap.">
          <form onSubmit={add} className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink/45">What they&apos;ll learn</label>
              <SoftInput
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="SQL joins & relationships"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink/45">Details</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                placeholder="Topics covered and what they should be able to do afterwards"
                className="w-full rounded-soft-sm bg-soft-muted px-3.5 py-3 text-sm text-ink outline-none placeholder:text-ink/35 focus:ring-2 focus:ring-forest/25"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink/45">Timeframe (optional)</label>
              <SoftInput
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                placeholder="Weeks 1–2"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink/45">Learning resource (optional)</label>
              <SoftInput
                value={resourceUrl}
                onChange={(e) => setResourceUrl(e.target.value)}
                placeholder="https://..."
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-ink/70">
              <input
                type="checkbox"
                checked={prRequired}
                onChange={(e) => setPrRequired(e.target.checked)}
                className="h-4 w-4 accent-forest"
              />
              Mentees submit a PR for this step
            </label>
            {error && (
              <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <SoftButton type="submit" className="w-full" disabled={busy || !title.trim()}>
              Add step
            </SoftButton>
          </form>
        </SoftPanel>
      </div>
    </PageShell>
  );
}
