"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Clock, RotateCcw } from "lucide-react";
import {
  PageShell,
  SoftPanel,
  SoftInput,
  SoftButton,
  StatusBadge,
  EmptyState,
} from "@/components/app/ui";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type MiniProject = Database["public"]["Tables"]["mini_projects"]["Row"];
type Submission = Database["public"]["Tables"]["mini_project_submissions"]["Row"];

export default function MenteeProjectsPage() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<MiniProject[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [demoUrl, setDemoUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!user?.track) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    const { data: projectRows } = await supabase
      .from("mini_projects")
      .select("*")
      .eq("track", user.track)
      .order("week_number", { ascending: false });
    const rows = projectRows ?? [];
    setProjects(rows);

    if (rows.length) {
      const { data: subs } = await supabase
        .from("mini_project_submissions")
        .select("*")
        .eq("mentee_id", user.id)
        .in(
          "project_id",
          rows.map((p) => p.id)
        );
      setSubmissions(Object.fromEntries((subs ?? []).map((s) => [s.project_id, s])));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const current = projects[0];
  const past = projects.slice(1);
  const currentSubmission = current ? submissions[current.id] : undefined;

  useEffect(() => {
    if (currentSubmission) {
      setRepoUrl(currentSubmission.repo_url);
      setDemoUrl(currentSubmission.demo_url ?? "");
      setNotes(currentSubmission.notes ?? "");
    }
  }, [currentSubmission]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !current || !repoUrl.trim()) return;
    setError("");
    setSubmitting(true);
    const supabase = createClient();
    const { error: submitError } = await supabase.from("mini_project_submissions").upsert(
      {
        project_id: current.id,
        mentee_id: user.id,
        repo_url: repoUrl.trim(),
        demo_url: demoUrl.trim() || null,
        notes: notes.trim() || null,
        status: "submitted",
      },
      { onConflict: "project_id,mentee_id" }
    );
    setSubmitting(false);
    if (submitError) {
      setError(submitError.message);
      return;
    }
    await load();
  };

  if (!loading && projects.length === 0) {
    return (
      <PageShell
        title="Weekly mini-project"
        description="Solve a track-specific project every week."
      >
        <EmptyState
          title="No project posted yet"
          description={
            user?.track
              ? `Nothing assigned to ${user.track} yet — check back soon.`
              : "Pick a track from Settings to see your weekly project."
          }
        />
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Weekly mini-project"
      description="Solve a track-specific project every week and submit your repo for review."
    >
      {current && (
        <SoftPanel
          title={current.title}
          subtitle={`${current.track} · Week ${current.week_number}`}
          actions={
            currentSubmission ? (
              <StatusBadge
                tone={
                  currentSubmission.status === "approved"
                    ? "success"
                    : currentSubmission.status === "changes_requested"
                      ? "warning"
                      : "info"
                }
              >
                {currentSubmission.status.replace("_", " ")}
              </StatusBadge>
            ) : (
              <StatusBadge tone="neutral">Not submitted</StatusBadge>
            )
          }
        >
          {current.description && <p className="text-sm text-ink/60">{current.description}</p>}
          {current.due_at && (
            <p className="mt-2 text-xs text-ink/40">
              Due {new Date(current.due_at).toLocaleDateString()}
            </p>
          )}
          {current.resource_url && (
            <a
              href={current.resource_url}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-block text-xs font-semibold text-forest hover:underline"
            >
              Resource link
            </a>
          )}

          {currentSubmission?.mentor_feedback && (
            <div className="mt-4 rounded-soft-sm bg-soft-muted p-3 text-sm text-ink/70">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-ink/45">
                <Clock className="h-3.5 w-3.5" /> Mentor feedback
              </p>
              {currentSubmission.mentor_feedback}
            </div>
          )}

          {currentSubmission?.status === "approved" ? (
            <p className="mt-5 border-t border-soft pt-5 text-sm text-ink/60">
              Approved — nice work. Nothing more to submit this week.
            </p>
          ) : (
          <form onSubmit={submit} className="mt-5 space-y-3 border-t border-soft pt-5">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink/45">Repo URL</label>
              <SoftInput
                required
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/you/project"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink/45">Demo URL (optional)</label>
              <SoftInput value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://..." />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink/45">Notes (optional)</label>
              <SoftInput value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything your mentor should know" />
            </div>
            {error && (
              <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <SoftButton type="submit" disabled={submitting}>
              {currentSubmission ? (
                <>
                  <RotateCcw className="h-4 w-4" /> Resubmit
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Submit
                </>
              )}
            </SoftButton>
          </form>
          )}
        </SoftPanel>
      )}

      {past.length > 0 && (
        <SoftPanel title="Past weeks">
          <ul className="divide-y divide-[var(--line-subtle)]">
            {past.map((p) => {
              const sub = submissions[p.id];
              return (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-ink">{p.title}</p>
                    <p className="text-xs text-ink/45">Week {p.week_number}</p>
                  </div>
                  <StatusBadge tone={sub?.status === "approved" ? "success" : sub ? "info" : "neutral"}>
                    {sub ? sub.status.replace("_", " ") : "Missed"}
                  </StatusBadge>
                </li>
              );
            })}
          </ul>
        </SoftPanel>
      )}
    </PageShell>
  );
}
