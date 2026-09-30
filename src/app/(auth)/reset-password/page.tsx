"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { dashboardPathForUser } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/client";

/**
 * Landing page for the password-reset email (see forgot-password). The
 * Supabase browser client exchanges the link's code for a session on load,
 * so by the time auth finishes loading the user is signed in and can set a
 * new password.
 */
export default function ResetPasswordPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    router.replace(user ? dashboardPathForUser(user) : "/login");
  };

  if (isLoading) {
    return <p className="text-sm text-ink/60">Checking your reset link…</p>;
  }

  if (!user) {
    return (
      <div className="space-y-4 rounded-xl border border-line bg-white p-5">
        <p className="font-display font-semibold text-ink">Reset link expired</p>
        <p className="text-sm text-ink/70">
          This link is invalid or has already been used. Request a new one.
        </p>
        <Link href="/forgot-password" className="text-sm font-semibold text-forest hover:underline">
          Send a new reset link
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-forest font-semibold">
          <KeyRound className="w-3.5 h-3.5" />
          Password reset
        </div>
        <h2 className="font-display font-bold text-3xl text-ink tracking-tight">
          Choose a new password
        </h2>
        <p className="text-ink/65 font-body text-sm">
          For <strong>{user.email}</strong>.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label className="font-mono text-xs uppercase tracking-wider text-ink/50">
            New password
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
            Confirm password
          </label>
          <input
            type="password"
            required
            minLength={8}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-forest"
          />
        </div>
        {error && (
          <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-forest text-paper font-semibold py-3 hover:bg-forest-light transition-colors disabled:opacity-60"
        >
          Update password
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
