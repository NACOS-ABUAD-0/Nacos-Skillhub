"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { dashboardPathForUser } from "@/lib/auth/guards";
import { useTracks } from "@/lib/data/tracks";

export default function SignupPage() {
  const { user, isLoading, signUp } = useAuth();
  const router = useRouter();
  const tracks = useTracks();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [matricNumber, setMatricNumber] = useState("");
  const [track, setTrack] = useState("Fullstack");
  const [error, setError] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(dashboardPathForUser(user));
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const result = await signUp({ fullName, email, password, matricNumber, track });
    if (!result.ok) {
      setError(result.error ?? "Signup failed");
      return;
    }
    if (result.needsEmailConfirmation) setNeedsConfirmation(true);
  };

  if (needsConfirmation) {
    return (
      <div className="space-y-4 rounded-xl border border-signal bg-signal-soft p-5">
        <p className="font-display font-semibold text-forest">Check your email</p>
        <p className="text-sm text-ink/70">
          We sent a confirmation link to <strong>{email}</strong>. Verify it, then come back
          and sign in.
        </p>
        <Link href="/login" className="text-sm font-semibold text-forest hover:underline">
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-forest font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          Mentee registration
        </div>
        <h2 className="font-display font-bold text-3xl text-ink tracking-tight">
          Join Skills Hub
        </h2>
        <p className="text-ink/65 font-body text-sm">
          Create a mentee profile to get matched with a mentor.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="font-mono text-xs uppercase tracking-wider text-ink/50">
            Full name
          </label>
          <input
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-forest"
            placeholder="Ada Okoro"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-mono text-xs uppercase tracking-wider text-ink/50">
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-forest"
            placeholder="you@abuad.edu.ng"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-mono text-xs uppercase tracking-wider text-ink/50">
            Password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-forest"
            placeholder="At least 8 characters"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-mono text-xs uppercase tracking-wider text-ink/50">
            Matric number
          </label>
          <input
            required
            value={matricNumber}
            onChange={(e) => setMatricNumber(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-forest"
            placeholder="22/CSE/001"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-mono text-xs uppercase tracking-wider text-ink/50">
            Interest track
          </label>
          <select
            value={track}
            onChange={(e) => setTrack(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-forest"
          >
            {tracks.map((t) => (
              <option key={t.id} value={t.name}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-forest text-paper font-semibold py-3 hover:bg-forest-light transition-colors"
        >
          Create mentee account
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="text-sm text-ink/60">
        Already registered?{" "}
        <Link href="/login" className="text-forest font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
