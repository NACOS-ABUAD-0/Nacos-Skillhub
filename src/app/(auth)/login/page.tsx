"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/auth/auth-context";
import { dashboardPathForUser } from "@/lib/auth/guards";
import { DEMO_LOGIN_ENABLED } from "@/lib/auth/demo-accounts";

export default function LoginPage() {
  const { user, isLoading, signIn, signInAsDemo } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && user) {
      router.replace(dashboardPathForUser(user));
    }
  }, [user, isLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const result = await signIn(email, password);
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error ?? "Sign in failed");
      return;
    }
    // redirect via effect after user updates
  };

  const demoLoginEnabled = DEMO_LOGIN_ENABLED;

  const enterDemo = async (role: "mentee" | "mentor" | "admin") => {
    setError("");
    const result = await signInAsDemo(role);
    if (!result.ok) setError(result.error ?? "Demo sign in failed");
  };

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-forest font-semibold">
          <ShieldCheck className="w-3.5 h-3.5" />
          Portal access
        </div>
        <h2 className="font-display font-bold text-3xl text-ink tracking-tight">
          Welcome back
        </h2>
        <p className="text-ink/65 font-body text-sm">
          Sign in with your email{demoLoginEnabled ? " or jump in with a demo role" : ""}.
        </p>
      </div>

      {demoLoginEnabled && (
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["mentee", "Enter as Mentee"],
              ["mentor", "Enter as Mentor"],
              ["admin", "Enter as Admin"],
            ] as const
          ).map(([role, label]) => (
            <button
              key={role}
              type="button"
              onClick={() => enterDemo(role)}
              className="px-3 py-1.5 rounded-lg border border-line bg-white text-xs font-medium text-forest hover:border-forest hover:bg-signal-soft transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      )}

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
            placeholder="you@abuad.edu.ng"
            className="w-full rounded-xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-forest"
          />
        </div>
        <div className="space-y-1.5">
          <label className="font-mono text-xs uppercase tracking-wider text-ink/50">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
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
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-forest text-paper font-semibold py-3 hover:bg-forest-light transition-colors"
        >
          Sign in
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm text-ink/60">
        <Link href="/forgot-password" className="hover:text-forest">
          Forgot password?
        </Link>
        <p>
          New here?{" "}
          <Link href="/signup" className="text-forest font-semibold hover:underline">
            Join as mentee
          </Link>
          {" · "}
          <Link
            href="/mentor/apply"
            className="text-forest font-semibold hover:underline"
          >
            Apply as mentor
          </Link>
        </p>
      </div>
    </div>
  );
}
