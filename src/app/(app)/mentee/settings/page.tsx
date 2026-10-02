"use client";

import { useState } from "react";
import { Lock, LockOpen } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import {
  PageShell,
  SoftPanel,
  SoftInput,
  SoftSelect,
  SoftButton,
} from "@/components/app/ui";
import { useTracks } from "@/lib/data/tracks";

export default function MenteeSettingsPage() {
  const { user, updateProfile, refreshUser } = useAuth();
  const tracks = useTracks();
  const [fullName, setFullName] = useState(user?.fullName ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [matricNumber, setMatricNumber] = useState(user?.matricNumber ?? "");
  const canEditMatric = !!user?.matricEditUnlocked;
  const [track, setTrack] = useState(user?.track ?? "Fullstack");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const matricChanged = canEditMatric && matricNumber.trim() !== (user?.matricNumber ?? "");
    if (matricChanged && !matricNumber.trim()) {
      setError("Matric / JAMB number cannot be empty.");
      return;
    }
    const result = await updateProfile({
      fullName,
      bio,
      track,
      ...(matricChanged ? { matricNumber: matricNumber.trim() } : {}),
    });
    if (!result.ok) {
      setError(result.error ?? "Could not save changes.");
      return;
    }
    // Saving a new number re-locks it server-side.
    if (matricChanged) await refreshUser();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <PageShell title="Settings" description="Update your mentee profile.">
      <SoftPanel title="Profile">
        <form onSubmit={save} className="max-w-lg space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink/45">Full name</label>
            <SoftInput value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink/45">Email</label>
            <SoftInput disabled value={user?.email ?? ""} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink/45">Matric / JAMB number</label>
            <SoftInput
              disabled={!canEditMatric}
              value={canEditMatric ? matricNumber : user?.matricNumber ?? ""}
              onChange={(e) => setMatricNumber(e.target.value)}
              placeholder="e.g. 25/SCI01/001"
              className="font-mono"
            />
            <p className="flex items-center gap-1.5 text-xs text-ink/50">
              {canEditMatric ? (
                <>
                  <LockOpen className="h-3.5 w-3.5 text-forest" aria-hidden />
                  Your mentor unlocked this. You can change it once; it locks again after you save.
                </>
              ) : (
                <>
                  <Lock className="h-3.5 w-3.5" aria-hidden />
                  Signed up with your JAMB number? Ask your mentor to unlock this when you get your matric number.
                </>
              )}
            </p>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink/45">Track</label>
            <SoftSelect value={track} onChange={(e) => setTrack(e.target.value)}>
              {tracks.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.name}
                </option>
              ))}
            </SoftSelect>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-ink/45">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full resize-none rounded-soft-sm bg-soft-muted px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-forest/25"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <SoftButton type="submit">{saved ? "Saved" : "Save changes"}</SoftButton>
        </form>
      </SoftPanel>
    </PageShell>
  );
}
