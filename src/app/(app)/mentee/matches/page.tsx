"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PageShell,
  SoftPanel,
  ProgressBar,
  StatusBadge,
  SoftButton,
  EmptyState,
} from "@/components/app/ui";
import { useAuth } from "@/lib/auth/auth-context";
import {
  fetchMatchedMentorIds,
  fetchMentorDirectory,
  requestMentorMatch,
  type MentorDirectoryEntry,
} from "@/lib/data/mentors";

export default function MenteeMatchesPage() {
  const { user } = useAuth();
  const [mentors, setMentors] = useState<MentorDirectoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestedIds, setRequestedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) fetchMatchedMentorIds(user.id).then(setRequestedIds);
  }, [user]);

  useEffect(() => {
    fetchMentorDirectory().then((m) => {
      setMentors(m);
      setLoading(false);
    });
  }, []);

  const ranked = useMemo(() => {
    return [...mentors]
      .map((m) => ({
        ...m,
        matchScore: m.track === user?.track ? 92 : 55,
      }))
      .sort((a, b) => b.matchScore - a.matchScore);
  }, [mentors, user?.track]);

  const connect = async (mentorId: string) => {
    if (!user) return;
    setError("");
    const err = await requestMentorMatch(user.id, mentorId);
    if (err) {
      setError(err);
      return;
    }
    setRequestedIds((prev) => new Set(prev).add(mentorId));
  };

  return (
    <PageShell
      title="Your matches"
      description="Ranked by track alignment with your profile."
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && ranked.length === 0 ? (
        <EmptyState
          title="No mentors yet"
          description="Once mentors are approved, your best matches will show up here."
        />
      ) : (
        <SoftPanel title="Ranked mentors" subtitle="Highest confidence first">
          <ul className="divide-y divide-[var(--line-subtle)]">
            {ranked.map((m, i) => (
              <li
                key={m.id}
                className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-soft-sm bg-soft-tint font-display font-bold text-forest">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink">{m.name}</h3>
                    <StatusBadge tone="info">{m.track}</StatusBadge>
                  </div>
                  <p className="line-clamp-2 text-sm text-ink/55">{m.bio}</p>
                  <div className="max-w-xs">
                    <div className="mb-1 flex justify-between text-[11px] text-ink/40">
                      <span>Confidence</span>
                      <span>{m.matchScore}%</span>
                    </div>
                    <ProgressBar value={m.matchScore} />
                  </div>
                </div>
                <SoftButton
                  variant="soft"
                  className="shrink-0"
                  disabled={requestedIds.has(m.id)}
                  onClick={() => connect(m.id)}
                >
                  {requestedIds.has(m.id) ? "Requested" : "Connect"}
                </SoftButton>
              </li>
            ))}
          </ul>
        </SoftPanel>
      )}
    </PageShell>
  );
}
