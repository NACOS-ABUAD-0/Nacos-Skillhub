"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Lock, LockOpen } from "lucide-react";
import { PageShell, SoftPanel, DataTable, ProgressBar, StatusBadge, EmptyState, SoftButton, type Column } from "@/components/app/ui";
import { MenteeProgressPanel } from "@/components/app/MenteeProgressPanel";
import { useAuth } from "@/lib/auth/auth-context";
import {
  fetchAssignedMentees,
  setMatchStatus,
  setMatricEditAccess,
  type AssignedMentee,
} from "@/lib/data/mentees";
import type { MatchStatus } from "@/lib/supabase/database.types";

export default function MentorMenteesPage() {
  const { user } = useAuth();
  const [mentees, setMentees] = useState<AssignedMentee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressFor, setProgressFor] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setMentees(await fetchAssignedMentees(user.id));
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const selected = mentees.find((m) => m.id === progressFor && m.matchStatus === "active");

  const respond = async (menteeId: string, status: MatchStatus) => {
    if (!user) return;
    setBusyId(menteeId);
    setError(null);
    const err = await setMatchStatus(user.id, menteeId, status);
    if (err) setError(err);
    else setMentees((prev) => prev.map((m) => (m.id === menteeId ? { ...m, matchStatus: status } : m)));
    setBusyId(null);
  };

  const toggleMatricAccess = async (m: AssignedMentee) => {
    setBusyId(m.id);
    setError(null);
    const unlocked = !m.matricEditUnlocked;
    const err = await setMatricEditAccess(m.id, unlocked);
    if (err) setError(err);
    else
      setMentees((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, matricEditUnlocked: unlocked } : x))
      );
    setBusyId(null);
  };

  const columns: Column<AssignedMentee>[] = [
    {
      key: "name",
      header: "Mentee",
      render: (m) => (
        <div>
          <p className="font-medium text-ink">{m.name}</p>
          <p className="text-xs text-ink/45">
            {m.level}
            {m.matricNumber && (
              <>
                {" · "}
                <span className="font-mono">{m.matricNumber}</span>
              </>
            )}
          </p>
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
        ) : m.matchStatus === "active" ? (
          <div className="flex gap-2">
            <SoftButton variant="soft" onClick={() => setProgressFor(m.id)}>
              Progress
            </SoftButton>
            <Link
              href={`/mentor/messages?with=${m.id}`}
              className="inline-flex h-10 items-center rounded-full bg-soft-muted px-4 text-sm font-semibold text-ink hover:bg-soft-raised"
            >
              Message
            </Link>
            <SoftButton
              variant={m.matricEditUnlocked ? "soft" : "ghost"}
              disabled={busyId === m.id}
              onClick={() => toggleMatricAccess(m)}
              title={
                m.matricEditUnlocked
                  ? "Mentee can change their matric / JAMB number once. Click to lock again."
                  : "Let this mentee replace their JAMB number with their matric number."
              }
            >
              {m.matricEditUnlocked ? (
                <>
                  <LockOpen className="h-4 w-4" aria-hidden /> Matric unlocked
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4" aria-hidden /> Unlock matric
                </>
              )}
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
      {user && selected && selected.track !== "—" && (
        <MenteeProgressPanel
          key={selected.id}
          mentorId={user.id}
          mentee={selected}
          onClose={() => setProgressFor(null)}
          onChange={load}
        />
      )}
    </PageShell>
  );
}
