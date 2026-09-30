"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  fetchMatchedMentorIds,
  fetchMentorDirectory,
  requestMentorMatch,
  type MentorDirectoryEntry,
} from "@/lib/data/mentors";
import { useTracks } from "@/lib/data/tracks";

export default function MenteeMentorsPage() {
  const { user } = useAuth();
  const tracks = useTracks();
  const [track, setTrack] = useState("All");
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

  const filtered = useMemo(
    () => (track === "All" ? mentors : mentors.filter((m) => m.track === track)),
    [track, mentors]
  );

  const requestMatch = async (mentorId: string) => {
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
      title="Browse mentors"
      description="Filter verified mentors by specialization track."
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <FilterBar onReset={() => setTrack("All")}>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink/45">Track</label>
          <SoftSelect value={track} onChange={(e) => setTrack(e.target.value)}>
            <option value="All">All tracks</option>
            {tracks.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </SoftSelect>
        </div>
      </FilterBar>

      {!loading && filtered.length === 0 ? (
        <EmptyState
          title="No mentors yet"
          description="Approved mentors in this track will appear here."
        />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((m) => (
            <SoftPanel
              key={m.id}
              title={m.name}
              subtitle={`${m.level} · ${m.track}`}
              actions={
                <StatusBadge
                  tone={
                    m.availability === "Open"
                      ? "success"
                      : m.availability === "Limited"
                        ? "warning"
                        : "neutral"
                  }
                >
                  {m.availability}
                </StatusBadge>
              }
            >
              <p className="text-sm text-ink/60">{m.bio}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {m.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md bg-soft-muted px-2 py-0.5 text-[11px] text-ink/55"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-soft pt-3 text-xs text-ink/45">
                <span>★ {m.rating || "—"}</span>
                <span>{m.mentees} mentees</span>
              </div>
              <SoftButton
                className="mt-4 w-full"
                disabled={requestedIds.has(m.id)}
                onClick={() => requestMatch(m.id)}
              >
                {requestedIds.has(m.id) ? "Requested" : "Request match"}
              </SoftButton>
            </SoftPanel>
          ))}
        </div>
      )}
    </PageShell>
  );
}
