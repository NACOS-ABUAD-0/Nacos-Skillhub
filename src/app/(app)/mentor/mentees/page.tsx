"use client";

import { useEffect, useState } from "react";
import { PageShell, SoftPanel, DataTable, ProgressBar, StatusBadge, EmptyState, SoftButton, type Column } from "@/components/app/ui";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchAssignedMentees, setMatchStatus, type AssignedMentee } from "@/lib/data/mentees";
import type { MatchStatus } from "@/lib/supabase/database.types";

export default function MentorMenteesPage() {
  const { user } = useAuth();
  const [mentees, setMentees] = useState<AssignedMentee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    fetchAssignedMentees(user.id).then((m) => {
      setMentees(m);
      setLoading(false);
    });
  }, [user]);

  const respond = async (menteeId: string, status: MatchStatus) => {
    if (!user) return;
    setBusyId(menteeId);
    setError(null);
    const err = await setMatchStatus(user.id, menteeId, status);
    if (err) setError(err);
    else setMentees((prev) => prev.map((m) => (m.id === menteeId ? { ...m, matchStatus: status } : m)));
    setBusyId(null);
  };

  const columns: Column<AssignedMentee>[] = [
    {
      key: "name",
      header: "Mentee",
      render: (m) => (
        <div>
          <p className="font-medium text-ink">{m.name}</p>
          <p className="text-xs text-ink/45">{m.level}</p>
        </div>
      ),
    },
    {
      key: "track",
      header: "Track",
      render: (m) => <StatusBadge tone="info">{m.track}</StatusBadge>,
    },
    {
      key: "progress",
      header: "Progress",
      render: (m) => (
        <div className="min-w-[120px] space-y-1">
          <span className="text-xs text-ink/45">{m.progress}%</span>
          <ProgressBar value={m.progress} />
        </div>
      ),
    },
    { key: "nextMilestone", header: "Next" },
    {
      key: "matchStatus",
      header: "Status",
      render: (m) => (
        <StatusBadge
          tone={m.matchStatus === "active" ? "success" : m.matchStatus === "ended" ? "neutral" : "warning"}
        >
          {m.matchStatus}
        </StatusBadge>
      ),
    },
    {
      key: "actions",
      header: "",
      render: (m) =>
        m.matchStatus === "requested" ? (
          <div className="flex gap-2">
            <SoftButton disabled={busyId === m.id} onClick={() => respond(m.id, "active")}>
              Accept
            </SoftButton>
            <SoftButton variant="ghost" disabled={busyId === m.id} onClick={() => respond(m.id, "ended")}>
              Decline
            </SoftButton>
          </div>
        ) : null,
    },
  ];

  return (
    <PageShell
      title="Your mentees"
      description="Matched learners and milestone progress."
    >
      {!loading && mentees.length === 0 ? (
        <EmptyState
          title="No mentees yet"
          description="Mentee match requests will show up here."
        />
      ) : (
        <SoftPanel title="Roster" subtitle={`${mentees.length} mentees`}>
          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          <DataTable columns={columns} rows={mentees} rowKey={(m) => m.id} />
        </SoftPanel>
      )}
    </PageShell>
  );
}
