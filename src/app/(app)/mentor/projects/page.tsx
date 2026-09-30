"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PageShell,
  SoftPanel,
  FilterBar,
  SoftSelect,
  SoftInput,
  SoftButton,
  StatusBadge,
  EmptyState,
  SectionHeader,
} from "@/components/app/ui";
import { MiniProjectManager } from "@/components/app/MiniProjectManager";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Submission = Database["public"]["Tables"]["mini_project_submissions"]["Row"] & {
  projectTitle?: string;
  weekNumber?: number;
  menteeName?: string;
};

export default function MentorProjectsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("all");
  const [feedbackDraft, setFeedbackDraft] = useState<Record<string, string>>({});
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: subs } = await supabase
      .from("mini_project_submissions")
      .select("*")
      .order("submitted_at", { ascending: false });
    const rows = subs ?? [];
    if (!rows.length) {
      setSubmissions([]);
      setLoading(false);
      return;
    }

    const projectIds = [...new Set(rows.map((r) => r.project_id))];
    const menteeIds = [...new Set(rows.map((r) => r.mentee_id))];
    const [{ data: projects }, { data: mentees }] = await Promise.all([
      supabase.from("mini_projects").select("id, title, week_number").in("id", projectIds),
      supabase.from("profiles").select("id, full_name").in("id", menteeIds),
    ]);

    setSubmissions(
      rows.map((r) => ({
        ...r,
        projectTitle: projects?.find((p) => p.id === r.project_id)?.title,
        weekNumber: projects?.find((p) => p.id === r.project_id)?.week_number,
        menteeName: mentees?.find((m) => m.id === r.mentee_id)?.full_name,
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = status === "all" ? submissions : submissions.filter((s) => s.status === status);

  const review = async (id: string, nextStatus: "approved" | "changes_requested") => {
    setError("");
    const supabase = createClient();
    const { error: reviewError } = await supabase
      .from("mini_project_submissions")
      .update({
        status: nextStatus,
        mentor_feedback: feedbackDraft[id]?.trim() || null,
      })
      .eq("id", id);
    if (reviewError) setError(reviewError.message);
    await load();
  };

  return (
    <PageShell
      title="Mini-projects"
      description="Post weekly projects for your track and review what mentees submit."
    >
      <section>
        <SectionHeader title={user?.track ? `${user.track} projects` : "Your track's projects"} />
        {user?.track ? (
          <MiniProjectManager fixedTrack={user.track} />
        ) : (
          <EmptyState
            title="No track assigned"
            description="Ask an admin to assign your mentoring track before posting projects."
          />
        )}
      </section>

      <SectionHeader title="Submissions to review" />
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && submissions.length === 0 ? (
        <EmptyState title="Nothing to review" description="Submissions will show up here once mentees submit." />
      ) : (
        <>
          <FilterBar onReset={() => setStatus("all")}>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-ink/45">Status</label>
              <SoftSelect value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="all">All</option>
                <option value="submitted">Submitted</option>
                <option value="changes_requested">Changes requested</option>
                <option value="approved">Approved</option>
              </SoftSelect>
            </div>
          </FilterBar>

          <SoftPanel title="Submissions" subtitle={`${filtered.length} items`}>
            <ul className="divide-y divide-[var(--line-subtle)]">
              {filtered.map((s) => (
                <li key={s.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-ink">
                          {s.projectTitle ?? "Project"} · Week {s.weekNumber ?? "—"}
                        </h3>
                        <StatusBadge
                          tone={
                            s.status === "approved" ? "success" : s.status === "changes_requested" ? "warning" : "info"
                          }
                        >
                          {s.status.replace("_", " ")}
                        </StatusBadge>
                      </div>
                      <p className="text-xs text-ink/45">
                        {s.menteeName ?? "Mentee"} ·{" "}
                        <a href={s.repo_url} target="_blank" rel="noreferrer" className="hover:underline">
                          {s.repo_url}
                        </a>
                      </p>
                      {s.notes && <p className="mt-1 text-sm text-ink/60">{s.notes}</p>}
                    </div>
                  </div>
                  {s.status !== "approved" && (
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <SoftInput
                        value={feedbackDraft[s.id] ?? ""}
                        onChange={(e) => setFeedbackDraft((prev) => ({ ...prev, [s.id]: e.target.value }))}
                        placeholder="Feedback (optional)"
                        className="flex-1"
                      />
                      <div className="flex gap-2">
                        <SoftButton
                          variant="primary"
                          className="h-9 px-3 text-xs"
                          onClick={() => review(s.id, "approved")}
                        >
                          Approve
                        </SoftButton>
                        <SoftButton
                          variant="soft"
                          className="h-9 px-3 text-xs"
                          onClick={() => review(s.id, "changes_requested")}
                        >
                          Request changes
                        </SoftButton>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </SoftPanel>
        </>
      )}
    </PageShell>
  );
}
