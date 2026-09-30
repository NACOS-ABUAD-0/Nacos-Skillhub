"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowRight, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined,
    });
    setSubmitting(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-forest font-semibold">
          <Mail className="w-3.5 h-3.5" />
          Password reset
        </div>
        <h2 className="font-display font-bold text-3xl text-ink tracking-tight">
          Reset access
        </h2>
        <p className="text-ink/65 font-body text-sm">
          Enter your account email and we&apos;ll send a reset link.
        </p>
      </div>

      {sent ? (
        <div className="rounded-xl border border-signal bg-signal-soft p-5 space-y-3">
          <p className="font-display font-semibold text-forest">
            Reset link sent
          </p>
          <p className="text-sm text-ink/70">
            Check <strong>{email}</strong> for a link to set a new password.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-sm font-semibold text-forest hover:underline"
          >
            Back to login <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
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
            Send reset link
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      )}

      <p className="text-sm text-ink/60">
        <Link href="/login" className="text-forest font-semibold hover:underline">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
