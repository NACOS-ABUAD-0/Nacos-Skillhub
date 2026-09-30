"use client";

import { CheckCircle2, ExternalLink } from "lucide-react";
import { StatusBadge } from "@/components/app/ui";
import type { SkillStep } from "@/lib/data/skill-path";
import type { MilestoneStatus } from "@/lib/supabase/database.types";

/**
 * Numbered, vertical roadmap of a track's skill path. Mentees pass their
 * per-step status; mentors pass `renderActions` for edit controls.
 */
export function SkillRoadmap({
  steps,
  statusFor,
  renderActions,
}: {
  steps: SkillStep[];
  statusFor?: (step: SkillStep) => MilestoneStatus | undefined;
  renderActions?: (step: SkillStep, index: number) => React.ReactNode;
}) {
  return (
    <ol className="relative ml-4 border-l border-soft">
      {steps.map((step, i) => {
        const status = statusFor?.(step);
        return (
          <li key={step.id} className="relative pb-8 pl-9 last:pb-0">
            <span
              className={`absolute -left-4 top-0 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                status === "completed"
                  ? "bg-forest text-paper"
                  : status === "current"
                    ? "bg-gold-light text-[#7A5A14]"
                    : "bg-soft-tint text-forest"
              }`}
            >
              {status === "completed" ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
            </span>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-ink">{step.title}</h3>
                  {status === "completed" && <StatusBadge tone="success">completed</StatusBadge>}
                  {status === "current" && <StatusBadge tone="warning">in progress</StatusBadge>}
                  {step.pr_required && <StatusBadge tone="info">PR required</StatusBadge>}
                </div>
                {step.description && (
                  <p className="whitespace-pre-line text-sm text-ink/60">{step.description}</p>
                )}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-ink/45">
                  {step.due_label && <span>{step.due_label}</span>}
                  {step.resource_url && (
                    <a
                      href={step.resource_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-medium text-forest hover:underline"
                    >
                      Learning resource <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
              {renderActions && <div className="flex shrink-0 gap-1">{renderActions(step, i)}</div>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
