"use client";

import { useEffect, useState } from "react";
import { PageShell, SoftPanel, EmptyState, ProgressBar } from "@/components/app/ui";
import { SkillRoadmap } from "@/components/app/SkillRoadmap";
import { useAuth } from "@/lib/auth/auth-context";
import {
  fetchSkillPath,
  fetchStepProgress,
  summarizePath,
  type SkillStep,
  type StepProgress,
} from "@/lib/data/skill-path";

export default function MenteePathPage() {
  const { user } = useAuth();
  const track = user?.track;
  const [steps, setSteps] = useState<SkillStep[]>([]);
  const [progress, setProgress] = useState<StepProgress>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !track) return;
    Promise.all([fetchSkillPath(track), fetchStepProgress([user.id])]).then(([path, byMentee]) => {
      setSteps(path);
      setProgress(byMentee.get(user.id) ?? new Map());
      setLoading(false);
    });
  }, [user, track]);

  if (!track) {
    return (
      <PageShell title="Skill path" description="Your roadmap for the semester.">
        <EmptyState
          title="Pick a track first"
          description="Take the quiz or choose a track in Settings to see what you'll learn."
        />
      </PageShell>
    );
  }

  if (!loading && steps.length === 0) {
    return (
      <PageShell title="Skill path" description={`Your ${track} roadmap.`}>
        <EmptyState
          title="Roadmap coming soon"
          description={`${track} mentors haven't published the skill path yet — check back soon.`}
        />
      </PageShell>
    );
  }

  const summary = summarizePath(steps, progress);

  return (
    <PageShell
      title="Skill path"
      description={`What you'll learn in ${track}, step by step — set by your track's mentors.`}
    >
      <SoftPanel
        title={`${track} roadmap`}
        subtitle={`${summary.completed} of ${summary.total} steps completed`}
      >
        <div className="mb-6 max-w-sm">
          <ProgressBar value={summary.percent} />
        </div>
        <SkillRoadmap steps={steps} statusFor={(step) => progress.get(step.id)} />
      </SoftPanel>
    </PageShell>
  );
}
