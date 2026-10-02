"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Star, ShieldCheck, ArrowRight, UserCheck, CheckCircle2, Clock, BookOpen } from "lucide-react";

interface MentorPreviewProps {
  onOpenAuth: (mode?: "login" | "signup" | "mentor") => void;
}

interface Mentor {
  id: string;
  name: string;
  role: string;
  department: string;
  level: string;
  institution: string;
  avatarBg: string;
  initials: string;
  headlineSkill: string;
  rating: number;
  studentsCount: number;
  availability: "Available this week" | "2 Slots Open" | "Fully Booked";
  tags: string[];
  bio: string;
}

const mentors: Mentor[] = [
  {
    id: "1",
    name: "Emeka Okafor",
    role: "Senior Cybersecurity Lead",
    department: "Computer Science",
    level: "Alumni (First Class)",
    institution: "ABUAD '23 · Ex-Interswitch Intern",
    avatarBg: "bg-forest",
    initials: "EO",
    headlineSkill: "Network Security & Pen-Testing",
    rating: 4.96,
    studentsCount: 24,
    availability: "Available this week",
    tags: ["Pen-Testing", "Burp Suite", "Linux", "Network Security"],
    bio: "Helped 18 mentees earn their first security certifications and land SIWES placements. Let's break (and fix) real systems together.",
  },
  {
    id: "2",
    name: "Damilola Adeleke",
    role: "Lead Fullstack & Systems Engineer",
    department: "Software Engineering",
    level: "500L Senior",
    institution: "ABUAD · Google Dev Student Club Lead",
    avatarBg: "bg-[#0D5C3A]",
    initials: "DA",
    headlineSkill: "Next.js, TypeScript & Go",
    rating: 4.92,
    studentsCount: 31,
    availability: "2 Slots Open",
    tags: ["Next.js App Router", "Go APIs", "PostgreSQL", "System Design"],
    bio: "Focuses on building production-ready architectures, writing clean code, and preparing you for senior technical interviews.",
  },
  {
    id: "3",
    name: "Amina Yusuf",
    role: "Mobile Dev & UI/UX Lead",
    department: "Computer Science",
    level: "400L Senior",
    institution: "ABUAD · Flutter Community Lead",
    avatarBg: "bg-forest",
    initials: "AY",
    headlineSkill: "Flutter & Figma",
    rating: 4.98,
    studentsCount: 19,
    availability: "Available this week",
    tags: ["Flutter", "Figma", "Firebase", "Design Systems"],
    bio: "Guiding students from Figma prototype to Play Store release, and shaping high-distinction Final Year Project apps.",
  },
];

const filterCategories = ["All Tracks", "Mobile Dev", "Cybersecurity", "Frontend", "Backend", "UI/UX", "Database (SQL)", "Fullstack", "DevOps", "Machine Learning"];

export default function MentorPreview({ onOpenAuth }: MentorPreviewProps) {
  const [selectedFilter, setSelectedFilter] = useState("All Tracks");

  return (
    <section id="mentors" className="py-20 bg-paper border-t border-line">
      <div className="max-w-7xl mx-auto px-6 sm:px-8">
        {/* Section Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
          <div className="max-w-2xl space-y-3">
            <span className="font-mono text-xs uppercase tracking-wider text-forest font-semibold flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-forest" />
              VERIFIED SENIOR MENTORS
            </span>
            <h2 className="font-display font-bold text-3xl sm:text-4xl text-ink tracking-tight">
              Learn from students who just crushed what you’re facing.
            </h2>
            <p className="text-base sm:text-lg text-ink/75 font-body leading-relaxed">
              Every mentor on NACOS Skills Hub has completed rigorous department vetting, verified project proofs, and demonstrated clear teaching empathy.
            </p>
          </div>

          <button
            onClick={() => onOpenAuth("signup")}
            className="self-start md:self-auto px-5 py-2.5 rounded-xl border border-line bg-white hover:bg-paper text-ink text-sm font-semibold inline-flex items-center gap-2 transition-all duration-150 shadow-2xs hover:border-forest/40"
          >
            <span>Browse All Mentors</span>
            <ArrowRight className="w-4 h-4 text-forest" />
          </button>
        </div>

        {/* Filter Pills (Interactive signals) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
          <span className="font-mono text-xs text-ink/60 uppercase tracking-wider mr-2 hidden sm:inline-block">
            Filter:
          </span>
          {filterCategories.map((filter, i) => (
            <button
              key={i}
              onClick={() => setSelectedFilter(filter)}
              className={`font-mono text-xs px-3.5 py-1.5 rounded-lg transition-all duration-150 whitespace-nowrap cursor-pointer ${
                selectedFilter === filter
                  ? "bg-forest text-paper font-semibold shadow-xs"
                  : "bg-white border border-line text-ink/75 hover:border-forest/40"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        {/* 3 Mentor Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {mentors.map((m) => (
            <div
              key={m.id}
              className="bg-white rounded-2xl border border-line p-6 flex flex-col justify-between hover:border-forest/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-200 group"
            >
              <div>
                {/* Header with Avatar & Details */}
                <div className="flex items-start gap-3.5 pb-4 mb-4 border-b border-line">
                  <div className={`w-13 h-13 rounded-2xl ${m.avatarBg} text-paper flex items-center justify-center font-display font-bold text-lg shrink-0 shadow-xs border border-white/20`}>
                    {m.initials}
                  </div>
                  <div className="space-y-0.5 overflow-hidden">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display font-bold text-base text-ink truncate group-hover:text-forest transition-colors">
                        {m.name}
                      </h3>
                      <ShieldCheck className="w-4 h-4 text-forest shrink-0" />
                    </div>
                    <p className="font-mono text-xs text-forest font-medium truncate">
                      {m.headlineSkill}
                    </p>
                    <p className="text-[11px] text-ink/60 font-body truncate">
                      {m.institution}
                    </p>
                  </div>
                </div>

                {/* Rating & Mentee Stats Bar */}
                <div className="grid grid-cols-2 gap-2 py-2 px-3 rounded-xl bg-paper/70 border border-line-subtle mb-4 text-xs font-mono">
                  <div className="flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 fill-gold text-gold shrink-0" />
                    <span className="font-bold text-ink">{m.rating}</span>
                    <span className="text-ink/50 text-[10px]">Rating</span>
                  </div>
                  <div className="flex items-center gap-1.5 border-l border-line pl-2">
                    <BookOpen className="w-3.5 h-3.5 text-forest shrink-0" />
                    <span className="font-bold text-ink">{m.studentsCount}</span>
                    <span className="text-ink/50 text-[10px]">Mentees</span>
                  </div>
                </div>

                {/* Bio */}
                <p className="text-xs sm:text-sm text-ink/75 font-body leading-relaxed line-clamp-3 mb-4">
                  "{m.bio}"
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {m.tags.map((t, tIdx) => (
                    <span
                      key={tIdx}
                      className="font-mono text-[10px] px-2 py-0.5 rounded bg-paper border border-line text-ink/70"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              {/* Card Footer with Availability & Request Button */}
              <div className="pt-4 border-t border-line-subtle flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-forest">
                  <Clock className="w-3.5 h-3.5 text-signal" />
                  <span>{m.availability}</span>
                </div>
                <button
                  onClick={() => onOpenAuth("signup")}
                  className="px-3 py-1.5 rounded-lg bg-forest/10 hover:bg-forest hover:text-paper text-forest text-xs font-semibold font-mono transition-all duration-150 cursor-pointer"
                >
                  Request Match
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
