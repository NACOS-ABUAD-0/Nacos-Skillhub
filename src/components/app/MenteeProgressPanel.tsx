"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SoftPanel, SoftSelect, SoftButton, ProgressBar, EmptyState } from "@/components/app/ui";
import { SkillRoadmap } from "@/components/app/SkillRoadmap";
import {
  fetchSkillPath,
  fetchStepProgress,
  setStepStatus,
  summarizePath,
  type SkillStep,
  type StepProgress,
} from "@/lib/data/skill-path";
import type { MilestoneStatus } from "@/lib/supabase/database.types";

const STATUS_OPTIONS: { value: MilestoneStatus; label: string }[] = [
  { value: "locked", label: "Not started" },
  { value: "current", label: "In progress" },
  { value: "completed", label: "Completed" },
];

/** Mentor view of one mentee's skill path, with a status control per step. */
export function MenteeProgressPanel({
  mentorId,
  mentee,
  onClose,
  onChange,
}: {
  mentorId: string;
  mentee: { id: string; name: string; track: string };
  onClose: () => void;
  onChange: () => void;
}) {
  const [steps, setSteps] = useState<SkillStep[]>([]);
  const [progress, setProgress] = useState<StepProgress>(new Map());
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const load = useCallback(async () => {
    const [path, byMentee] = await Promise.all([
      fetchSkillPath(mentee.track),
      fetchStepProgress([mentee.id]),
    ]);
    setSteps(path);
    setProgress(byMentee.get(mentee.id) ?? new Map());
    setLoading(false);
  }, [mentee.id, mentee.track]);

  useEffect(() => {
    load();
  }, [load]);

  const update = async (step: SkillStep, status: MilestoneStatus) => {
    setError("");
    setSavingId(step.id);
    const err = await setStepStatus(mentorId, mentee.id, step, status);
    if (err) {
      setError(err);
    } else {
      setProgress((prev) => new Map(prev).set(step.id, status));
      onChange();
    }
    setSavingId(null);
  };

  const summary = summarizePath(steps, progress);

  return (
    <div ref={rootRef} className="scroll-mt-6">
      <SoftPanel
        title={`${mentee.name}'s skill path`}
        subtitle={`${mentee.track} · ${summary.completed} of ${summary.total} steps completed`}
        actions={
          <SoftButton variant="ghost" onClick={onClose}>
            Close
          </SoftButton>
        }
      >
        {!loading && steps.length === 0 ? (
          <EmptyState
            title="No roadmap for this track yet"
            description={`${mentee.track} doesn't have a skill path yet.`}
          />
        ) : (
          <div className="space-y-6">
            <div className="max-w-sm">
              <ProgressBar value={summary.percent} />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <SkillRoadmap
              steps={steps}
              statusFor={(step) => progress.get(step.id)}
              renderActions={(step) => (
                <SoftSelect
                  aria-label={`Status for ${step.title}`}
                  value={progress.get(step.id) ?? "locked"}
                  disabled={savingId === step.id}
                  onChange={(e) => update(step, e.target.value as MilestoneStatus)}
                  className="h-9"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </SoftSelect>
              )}
            />
          </div>
        )}
        <p className="mt-6 text-xs text-ink/45">
          Want to change the steps themselves? Edit your track&apos;s roadmap in{" "}
          <Link href="/mentor/path" className="font-medium text-forest hover:underline">
            Skill path
          </Link>
          .
        </p>
      </SoftPanel>
    </div>
  );
}
