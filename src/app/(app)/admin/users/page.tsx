"use client";

import { useMemo, useState } from "react";
import { Check, GraduationCap, Layers, ShieldCheck, Users } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import type { MockUser, UserRole } from "@/lib/auth/types";
import { useTracks, type TrackOption } from "@/lib/data/tracks";
import {
  PageShell,
  SoftPanel,
  FilterBar,
  SoftInput,
  SoftSelect,
  DataTable,
  StatusBadge,
  type Column,
} from "@/components/app/ui";
import { ColorDot, SoftDropdown, type DropdownOption } from "@/components/app/SoftDropdown";

const ROLE_OPTIONS: DropdownOption<UserRole>[] = [
  { value: "mentee", label: "Mentee", description: "Learns on a track", icon: <GraduationCap />, accent: "#2F6B8F" },
  { value: "mentor", label: "Mentor", description: "Guides mentees, authors content", icon: <Users />, accent: "#16452E" },
  { value: "admin", label: "Admin", description: "Full access to the hub", icon: <ShieldCheck />, accent: "#B4572E" },
];

export default function AdminUsersPage() {
  const { user: me, getAllUsers, setUserRole } = useAuth();
  const users = getAllUsers();
  const tracks = useTracks();
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState("all");

  const filtered = useMemo(() => {
    return users.filter((u) => {
      const matchQ =
        !q ||
        u.fullName.toLowerCase().includes(q.toLowerCase()) ||
        u.email.toLowerCase().includes(q.toLowerCase()) ||
        u.matricNumber.toLowerCase().includes(q.toLowerCase());
      const matchRole = role === "all" || u.role === role;
      return matchQ && matchRole;
    });
  }, [users, q, role]);

  const columns: Column<MockUser>[] = [
    {
      key: "fullName",
      header: "Name",
      render: (u) => <span className="font-medium text-ink">{u.fullName}</span>,
    },
    { key: "email", header: "Email" },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <RoleEditor
          user={u}
          tracks={tracks}
          isSelf={u.id === me?.id}
          onSave={async (role, track) => {
            setError(null);
            const res = await setUserRole(u.id, role, track);
            if (!res.ok) setError(res.error ?? "Could not update role.");
          }}
        />
      ),
    },
    {
      key: "mentorStatus",
      header: "Mentor status",
      render: (u) => (
        <StatusBadge
          tone={
            u.mentorStatus === "approved"
              ? "success"
              : u.mentorStatus === "pending"
                ? "warning"
                : u.mentorStatus === "rejected"
                  ? "danger"
                  : "neutral"
          }
        >
          {u.mentorStatus}
        </StatusBadge>
      ),
    },
    {
      key: "matricNumber",
      header: "Matric / JAMB",
      render: (u) => (
        <span className="font-mono text-xs text-ink/50">{u.matricNumber}</span>
      ),
    },
  ];

  return (
    <PageShell title="Users" description="All accounts. Change a user's role or track from the Role column.">
      {error && (
        <p className="rounded-soft-sm bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
      )}
      <FilterBar onReset={() => { setQ(""); setRole("all"); }}>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink/45">Search</label>
          <SoftInput
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, matric/JAMB…"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-ink/45">Role</label>
          <SoftSelect value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="all">All roles</option>
            <option value="mentee">Mentee</option>
            <option value="mentor">Mentor</option>
            <option value="admin">Admin</option>
          </SoftSelect>
        </div>
      </FilterBar>

      <SoftPanel
        title="Directory"
        subtitle={`${filtered.length} of ${users.length} users`}
      >
        <DataTable
          columns={columns}
          rows={filtered}
          rowKey={(u) => u.id}
        />
      </SoftPanel>
    </PageShell>
  );
}

function RoleEditor({
  user,
  tracks,
  isSelf,
  onSave,
}: {
  user: MockUser;
  tracks: TrackOption[];
  isSelf: boolean;
  onSave: (role: UserRole, track?: string) => Promise<void>;
}) {
  const [role, setRole] = useState<UserRole>(user.role);
  const [track, setTrack] = useState(user.track ?? "");
  const [saving, setSaving] = useState(false);
  const dirty = role !== user.role || track !== (user.track ?? "");

  if (isSelf) {
    return <StatusBadge tone="info">{user.role} (you)</StatusBadge>;
  }

  const trackOptions: DropdownOption<string>[] = [
    { value: "", label: "No track", icon: <Layers /> },
    ...tracks.map((t) => ({
      value: t.name,
      label: t.name,
      icon: <ColorDot color={t.color ?? "#16452E"} />,
      accent: t.color ?? undefined,
    })),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SoftDropdown
        value={role}
        options={ROLE_OPTIONS}
        onChange={setRole}
        className="min-w-[124px]"
        panelMinWidth={250}
        ariaLabel={`Role for ${user.fullName}`}
      />
      {role !== "admin" && (
        <SoftDropdown
          value={track}
          options={trackOptions}
          onChange={setTrack}
          className="min-w-[150px]"
          ariaLabel={`Track for ${user.fullName}`}
        />
      )}
      {dirty && (
        <button
          type="button"
          disabled={saving || (role === "mentor" && !track)}
          title={role === "mentor" && !track ? "Mentors need a track" : undefined}
          onClick={async () => {
            setSaving(true);
            await onSave(role, role === "admin" ? undefined : track || undefined);
            setSaving(false);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-forest px-3.5 text-sm font-medium text-white shadow-[0_2px_8px_-2px_rgba(22,69,46,0.45)] transition-all hover:bg-[var(--forest-light)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-45"
        >
          <Check className="h-4 w-4" aria-hidden />
          {saving ? "Saving…" : "Save"}
        </button>
      )}
    </div>
  );
}
