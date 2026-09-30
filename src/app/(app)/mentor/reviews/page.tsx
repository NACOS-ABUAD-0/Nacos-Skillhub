"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PageShell,
  SoftPanel,
  FilterBar,
  SoftSelect,
  SoftButton,
  StatusBadge,
  EmptyState,
} from "@/components/app/ui";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";
import type { Database, ReviewStatus } from "@/lib/supabase/database.types";

type PrReview = Database["public"]["Tables"]["pr_reviews"]["Row"] & { menteeName?: string };

const NEXT_STATUS: Record<ReviewStatus, ReviewStatus> = {
  Pending: "In review",
  "In review": "Done",
  Done: "Done",
};

export default function MentorReviewsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState("all");
  const [reviews, setReviews] = useState<PrReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const { data } = await supabase
      .from("pr_reviews")
      .select("*")
      .eq("mentor_id", user.id)
      .order("submitted_at", { ascending: false });
    const rows = data ?? [];
    const menteeIds = [...new Set(rows.map((r) => r.mentee_id))];
    const { data: mentees } = menteeIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", menteeIds)
      : { data: [] as { id: string; full_name: string }[] };
    setReviews(
      rows.map((r) => ({
        ...r,
        menteeName: mentees?.find((m) => m.id === r.mentee_id)?.full_name,
      }))
    );
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(
    () => (status === "all" ? reviews : reviews.filter((r) => r.status === status)),
    [status, reviews]
  );

  const advance = async (review: PrReview) => {
    setError("");
    const supabase = createClient();
    const { error: updateError } = await supabase
      .from("pr_reviews")
      .update({ status: NEXT_STATUS[review.status] })
      .eq("id", review.id);
    if (updateError) setError(updateError.message);
    await load();
  };

  return (
    <PageShell
      title="PR reviews"
      description="Async code teardown queue from your mentees."
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <FilterBar onReset={() => setStatus("all")}>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink/45">Status</label>
          <SoftSelect value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All</option>
            <option value="Pending">Pending</option>
            <option value="In review">In review</option>
            <option value="Done">Done</option>
          </SoftSelect>
        </div>
      </FilterBar>

      {!loading && filtered.length === 0 ? (
        <EmptyState title="Queue is clear" description="No PRs waiting for review." />
      ) : (
        <SoftPanel title="Queue" subtitle={`${filtered.length} items`}>
          <ul className="divide-y divide-[var(--line-subtle)]">
            {filtered.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1 flex flex-wrap gap-2">
                    <StatusBadge tone={r.priority === "High" ? "warning" : "neutral"}>
                      {r.priority}
                    </StatusBadge>
                    <StatusBadge
                      tone={
                        r.status === "Done" ? "success" : r.status === "In review" ? "info" : "neutral"
                      }
                    >
                      {r.status}
                    </StatusBadge>
                  </div>
                  <h3 className="font-semibold text-ink">{r.title}</h3>
                  <p className="mt-1 text-xs text-ink/45">
                    {r.menteeName ?? "Mentee"} ·{" "}
                    <a href={r.repo_url} target="_blank" rel="noreferrer" className="hover:underline">
                      {r.repo_url}
                    </a>{" "}
                    · {new Date(r.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <SoftButton className="shrink-0" disabled={r.status === "Done"} onClick={() => advance(r)}>
                  {r.status === "Pending" ? "Start review" : r.status === "In review" ? "Mark done" : "Done"}
                </SoftButton>
              </li>
            ))}
          </ul>
        </SoftPanel>
      )}
    </PageShell>
  );
}
