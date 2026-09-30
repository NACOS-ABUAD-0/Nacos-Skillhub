"use client";

import { useState } from "react";
import confetti from "canvas-confetti";
import { ArrowRight, RotateCcw, Sparkles } from "lucide-react";
import Link from "next/link";
import {
  PageShell,
  SoftPanel,
  SoftButton,
  StatusBadge,
} from "@/components/app/ui";
import { useAuth } from "@/lib/auth/auth-context";
import { createClient } from "@/lib/supabase/client";

const QUESTIONS = [
  {
    id: 1,
    title: "What excites you most?",
    options: [
      { label: "Apps people carry in their pocket", track: "Mobile Dev" },
      { label: "Finding and fixing security holes", track: "Cybersecurity" },
      { label: "Interfaces people love to use", track: "UI/UX" },
      { label: "Keeping data fast and reliable", track: "Database (SQL)" },
    ],
  },
  {
    id: 2,
    title: "Preferred hands-on work?",
    options: [
      { label: "Building responsive web pages", track: "Frontend" },
      { label: "Designing APIs and server logic", track: "Backend" },
      { label: "Writing queries and designing schemas", track: "Database (SQL)" },
      { label: "Threat analysis and pentesting", track: "Cybersecurity" },
    ],
  },
  {
    id: 3,
    title: "Which tool would you open first?",
    options: [
      { label: "Figma", track: "UI/UX" },
      { label: "React / Next.js", track: "Frontend" },
      { label: "Flutter / React Native", track: "Mobile Dev" },
      { label: "Node.js / Django", track: "Backend" },
    ],
  },
  {
    id: 4,
    title: "Semester goal?",
    options: [
      { label: "Ship a product end-to-end", track: "Fullstack" },
      { label: "Publish an app to the Play Store", track: "Mobile Dev" },
      { label: "Earn a security certification", track: "Cybersecurity" },
      { label: "Internship-ready web portfolio", track: "Fullstack" },
    ],
  },
];

export default function MenteeQuizPage() {
  const { user, updateProfile } = useAuth();
  const [step, setStep] = useState(0);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [done, setDone] = useState(false);

  const pick = async (track: string) => {
    const next = { ...scores, [track]: (scores[track] ?? 0) + 1 };
    setScores(next);
    if (step + 1 >= QUESTIONS.length) {
      setDone(true);
      confetti({ particleCount: 80, spread: 0.6, origin: { y: 0.7 } });
      const recommended = Object.entries(next).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Fullstack";
      if (user) {
        const supabase = createClient();
        await supabase.from("quiz_submissions").insert({
          mentee_id: user.id,
          answers: next,
          recommended_track: recommended,
        });
        await updateProfile({ track: recommended });
      }
    } else {
      setStep(step + 1);
    }
  };

  const winner =
    Object.entries(scores).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "Fullstack";

  const reset = () => {
    setStep(0);
    setScores({});
    setDone(false);
  };

  return (
    <PageShell
      title="Diagnostic quiz"
      description="Four quick questions to refine your track recommendation."
    >
      <SoftPanel className="max-w-xl">
        {!done ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <StatusBadge tone="info">
                Question {step + 1} / {QUESTIONS.length}
              </StatusBadge>
              <Sparkles className="h-4 w-4 text-gold" />
            </div>
            <h2 className="font-display text-2xl font-bold text-ink">
              {QUESTIONS[step].title}
            </h2>
            <div className="space-y-2">
              {QUESTIONS[step].options.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => pick(opt.track)}
                  className="w-full rounded-soft-sm bg-soft-muted px-4 py-3 text-left text-sm font-medium text-ink transition-colors hover:bg-soft-tint"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <StatusBadge tone="success">Complete</StatusBadge>
            <h2 className="font-display text-2xl font-bold text-ink">
              Recommended track: {winner}
            </h2>
            <p className="text-sm text-ink/55">
              Your profile track has been updated. Connect with mentors in this track from
              Matches.
            </p>
            <div className="flex flex-wrap gap-2">
              <SoftButton variant="soft" onClick={reset}>
                <RotateCcw className="h-4 w-4" /> Retake
              </SoftButton>
              <Link
                href="/mentee/matches"
                className="inline-flex h-10 items-center gap-2 rounded-full bg-forest px-4 text-sm font-semibold text-paper hover:bg-forest-light"
              >
                View matches <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </SoftPanel>
    </PageShell>
  );
}
