"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { ArrowRight, Search, Sparkles, Laptop, BookOpen, Terminal, Palette, Clock } from "lucide-react";
import TextLoop from "@/components/TextLoop";

interface HeroProps {
  onOpenQuiz: () => void;
  onOpenAuth: (mode?: "login" | "signup" | "mentor") => void;
}

interface IllustrationSlide {
  id: number;
  src: string;
  category: string;
  headline: string;
  subhead: string;
  icon: React.ReactNode;
}

const illustrationSlides: IllustrationSlide[] = [
  {
    id: 0,
    src: "/images/undraw_designing-components_kb05.svg",
    category: "Component & Frontend Systems",
    headline: "Master modular software & scalable frontend architecture.",
    subhead: "Pair with senior peers who build real Next.js and Flutter apps. Learn clean design systems, state management, and responsive engineering.",
    icon: <Laptop className="w-4 h-4" />,
  },
  {
    id: 1,
    src: "/images/undraw_in-the-zone_07y7.svg",
    category: "Backend & Database Systems",
    headline: "Ship production-ready code with confidence.",
    subhead: "Design clean SQL schemas, write resilient APIs, and build the server logic behind real products without getting stuck in tutorial hell.",
    icon: <Terminal className="w-4 h-4" />,
  },
  {
    id: 2,
    src: "/images/undraw_exam-prep_nmly.svg",
    category: "SIWES & Technical Placement",
    headline: "Ace your SIWES interviews & high-distinction FYP.",
    subhead: "Get guided by alumni who passed senior technical interviews at top engineering firms and built distinction-grade Final Year Projects.",
    icon: <BookOpen className="w-4 h-4" />,
  },
  {
    id: 3,
    src: "/images/undraw_learning-to-sketch_uaxi.svg",
    category: "UI/UX & Product Design",
    headline: "Transform creative ideas into pixel-perfect interfaces.",
    subhead: "Turn Figma prototypes into production software with accessible components, micro-animations, and design system tokens.",
    icon: <Palette className="w-4 h-4" />,
  },
  {
    id: 4,
    src: "/images/undraw_work-time_1ogn.svg",
    category: "Weekly Milestones & Code Reviews",
    headline: "Never code in isolation. Build with weekly peer reviews.",
    subhead: "Submit weekly pull requests, get personalized async code teardowns, and earn verifiable milestone certificates signed by NACOS.",
    icon: <Clock className="w-4 h-4" />,
  },
];

const skillTags = [
  "Mobile Dev",
  "Cybersecurity",
  "Frontend",
  "Backend",
  "UI/UX Design",
  "Database (SQL)",
  "Fullstack",
];

export default function Hero({ onOpenQuiz, onOpenAuth }: HeroProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const prefersReduced = useReducedMotion();

  // Smoothly cycle SVG illustrations & synchronized text every 3.8 seconds
  useEffect(() => {
    if (isPaused || prefersReduced) return;
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % illustrationSlides.length);
    }, 3800);
    return () => clearInterval(interval);
  }, [isPaused, prefersReduced]);

  const activeSlide = illustrationSlides[currentSlide];

  return (
    <section className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 w-[900px] h-[480px] bg-gradient-to-b from-[#16452E]/6 via-[#3DDC84]/5 to-transparent blur-3xl -z-10 pointer-events-none" />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 flex flex-col items-center text-center">
        
        {/* FIRST THING SEEN: The Main Attraction SVG Illustration */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="w-full max-w-2xl mx-auto relative flex flex-col items-center justify-center cursor-pointer"
          onClick={() => setCurrentSlide((prev) => (prev + 1) % illustrationSlides.length)}
          title="Click to view next skill track"
        >
          {/* Main SVG Frame */}
          <div className="relative w-full h-64 sm:h-80 md:h-96 flex items-center justify-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSlide.id}
                initial={{ opacity: 0, scale: 0.92, y: 14 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.92, y: -14 }}
                transition={{ duration: 0.55, ease: "easeOut" }}
                className="absolute inset-0 flex items-center justify-center"
              >
                <div className="relative w-full h-full max-h-64 sm:max-h-80 md:max-h-96 flex items-center justify-center p-2">
                  <Image
                    src={activeSlide.src}
                    alt={activeSlide.headline}
                    fill
                    className="object-contain drop-shadow-sm"
                    priority
                  />
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Interactive Slide Switcher Dots */}
          <div className="mt-4 flex items-center gap-2">
            {illustrationSlides.map((slide, idx) => (
              <button
                key={slide.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentSlide(idx);
                }}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  currentSlide === idx
                    ? "w-8 bg-forest"
                    : "w-2 bg-line hover:bg-forest/40"
                }`}
                aria-label={`Switch to ${slide.category}`}
              />
            ))}
          </div>
        </div>

        {/* DYNAMIC TEXT: Transitions in lockstep with the active SVG */}
        <div className="mt-8 sm:mt-10 min-h-[160px] sm:min-h-[180px] max-w-4xl mx-auto flex flex-col items-center justify-start">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSlide.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.45, ease: "easeOut" }}
              className="flex flex-col items-center"
            >
              {/* Category Pill */}
              <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-forest/10 border border-forest/15 text-xs font-mono font-semibold uppercase tracking-wider text-forest mb-3">
                {activeSlide.icon}
                <span>{activeSlide.category}</span>
              </span>

              {/* Dynamic Headline */}
              <h1 className="font-display font-bold text-ink leading-[1.1] text-3xl sm:text-4xl lg:text-[3.25rem] tracking-tight max-w-3xl">
                {activeSlide.headline}
              </h1>

              {/* Dynamic Subhead */}
              <p className="mt-3 sm:mt-4 text-base sm:text-lg text-ink/75 font-body leading-relaxed max-w-2xl">
                {activeSlide.subhead}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* CTAs */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto">
          <button
            onClick={onOpenQuiz}
            className="w-full sm:w-auto px-7 py-3.5 rounded-full bg-forest hover:bg-forest-dark text-paper font-semibold text-sm sm:text-base transition-all duration-150 transform hover:scale-[1.02] shadow-sm flex items-center justify-center gap-2 group cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-signal" />
            <span>Discover Your Skill</span>
            <ArrowRight className="w-4 h-4 text-paper/70 group-hover:translate-x-1 transition-transform" />
          </button>

          <a
            href="#mentors"
            className="w-full sm:w-auto px-7 py-3.5 rounded-full border border-line bg-white/80 hover:bg-white text-ink font-semibold text-sm sm:text-base transition-all duration-150 text-center hover:border-forest/40 flex items-center justify-center gap-2 shadow-2xs"
          >
            <Search className="w-4 h-4 text-ink/60" />
            <span>Find a Mentor</span>
          </a>
        </div>

        {/* Responsive Infinite Looping Tracks Marquee */}
        <div className="mt-12 sm:mt-16 pt-6 sm:pt-8 border-t border-line w-full overflow-hidden">
          <div className="relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_6%,black_94%,transparent)]">
            <motion.div
              className="flex items-center gap-6 sm:gap-8 w-max select-none py-1"
              animate={prefersReduced ? {} : { x: ["0%", "-50%"] }}
              transition={{
                repeat: Infinity,
                ease: "linear",
                duration: 28,
              }}
              whileHover={{ animationPlayState: "paused" }}
            >
              {[...Array(2)].map((_, loopIdx) => (
                <div key={loopIdx} className="flex items-center gap-6 sm:gap-8 shrink-0">
                  {[
                    "NACOS ABUAD",
                    "MOBILE DEV",
                    "CYBERSECURITY",
                    "FRONTEND",
                    "BACKEND",
                    "UI/UX DESIGN",
                    "DATABASE MANAGEMENT (SQL)",
                    "FULLSTACK",
                  ].map((track, trackIdx) => (
                    <div key={trackIdx} className="flex items-center gap-6 sm:gap-8">
                      <span className="font-mono text-xs sm:text-sm font-semibold tracking-wider text-[#71717A] uppercase whitespace-nowrap">
                        {track}
                      </span>
                      <span className="text-forest/60 text-xs sm:text-sm font-bold select-none">
                        ✦
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </motion.div>
          </div>
        </div>

      </div>
    </section>
  );
}
