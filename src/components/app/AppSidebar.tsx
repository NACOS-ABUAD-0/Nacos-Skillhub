"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import {
  LayoutDashboard,
  Users,
  GitPullRequest,
  Calendar,
  Award,
  MessageSquare,
  Settings,
  Compass,
  Route,
  Brain,
  ClipboardList,
  Shield,
  Layers,
  FileCheck,
  Code2,
  X,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { MockUser } from "@/lib/auth/types";
import { mentorNavRestricted } from "@/lib/auth/guards";
import { useAuth } from "@/lib/auth/auth-context";

export type NavItem = { href: string; label: string; icon: LucideIcon };
export type NavGroup = { label: string; items: NavItem[] };

export function menteeNav(): NavGroup[] {
  return [
    {
      label: "Overview",
      items: [
        { href: "/mentee/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Learning",
      items: [
        { href: "/mentee/mentors", label: "Mentors", icon: Users },
        { href: "/mentee/matches", label: "Matches", icon: Compass },
        { href: "/mentee/path", label: "Skill path", icon: Route },
        { href: "/mentee/projects", label: "Mini-projects", icon: Code2 },
        { href: "/mentee/quiz", label: "Quiz", icon: Brain },
        { href: "/mentee/certificates", label: "Certificates", icon: Award },
      ],
    },
    {
      label: "Workspace",
      items: [
        { href: "/mentee/messages", label: "Messages", icon: MessageSquare },
        { href: "/mentee/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

export function mentorNav(user: MockUser): NavGroup[] {
  if (mentorNavRestricted(user)) {
    return [
      {
        label: "Onboarding",
        items: [
          { href: "/mentor/application", label: "Application", icon: FileCheck },
          { href: "/mentor/settings", label: "Settings", icon: Settings },
        ],
      },
    ];
  }
  return [
    {
      label: "Overview",
      items: [
        { href: "/mentor/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "Mentoring",
      items: [
        { href: "/mentor/mentees", label: "Mentees", icon: Users },
        { href: "/mentor/path", label: "Skill path", icon: Route },
        { href: "/mentor/projects", label: "Mini-projects", icon: Code2 },
        { href: "/mentor/reviews", label: "Reviews", icon: GitPullRequest },
        { href: "/mentor/sessions", label: "Sessions", icon: Calendar },
        { href: "/mentor/certificates", label: "Certificates", icon: Award },
      ],
    },
    {
      label: "Workspace",
      items: [
        { href: "/mentor/messages", label: "Messages", icon: MessageSquare },
        { href: "/mentor/application", label: "Application", icon: FileCheck },
        { href: "/mentor/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

export function adminNav(): NavGroup[] {
  return [
    {
      label: "Overview",
      items: [
        { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      ],
    },
    {
      label: "People",
      items: [
        { href: "/admin/applications", label: "Applications", icon: ClipboardList },
        { href: "/admin/users", label: "Users", icon: Users },
        { href: "/admin/mentors", label: "Mentors", icon: Shield },
      ],
    },
    {
      label: "Ops",
      items: [
        { href: "/admin/projects", label: "Mini-projects", icon: Code2 },
        { href: "/admin/tracks", label: "Tracks", icon: Layers },
        { href: "/admin/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

function isRouteActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({
  groups,
  collapsed,
  onToggleCollapse,
  mobileOpen,
  onCloseMobile,
}: {
  groups: NavGroup[];
  collapsed?: boolean;
  onToggleCollapse?: () => void;
  mobileOpen?: boolean;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const { signOut } = useAuth();
  const router = useRouter();

  const brandRow = (
    <div
      className={`flex h-20 items-center gap-2 px-5 ${
        collapsed ? "justify-center px-0" : "justify-between"
      }`}
    >
      <Link
        href="/"
        onClick={onCloseMobile}
        className="flex items-center gap-2.5 min-w-0"
        aria-label="Skills Hub home"
      >
        {collapsed ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-soft-tint">
            <Image src="/images/nacoslogo.png" alt="" width={22} height={22} />
          </span>
        ) : (
          <>
            <Image
              src="/images/nacoslogo.png"
              alt="NACOS"
              width={28}
              height={28}
              className="shrink-0"
            />
            <div className="min-w-0">
              <p className="font-display text-sm font-semibold text-ink truncate">
                Skills Hub
              </p>
              <p className="text-2xs font-semibold uppercase tracking-wider text-ink/40">
                NACOS ABUAD
              </p>
            </div>
          </>
        )}
      </Link>

      {!collapsed && onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Collapse sidebar"
          className="hidden h-8 w-8 items-center justify-center rounded-full text-ink/40 transition-colors hover:bg-soft-muted hover:text-ink lg:flex"
        >
          <ChevronsLeft className="h-4 w-4" />
        </button>
      )}

      {onCloseMobile && (
        <button
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation"
          className="flex h-8 w-8 items-center justify-center rounded-full text-ink/40 hover:bg-soft-muted lg:hidden"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const nav = (
    <nav className="flex-1 space-y-6 overflow-y-auto px-3 pb-4">
      {groups.map((group) => (
        <div key={group.label} className="space-y-1">
          {!collapsed && (
            <p className="px-3 pb-1.5 text-2xs font-semibold uppercase tracking-wider text-ink/40">
              {group.label}
            </p>
          )}
          {collapsed && <div className="mx-3 mb-2 h-px bg-soft-raised" />}
          {group.items.map((item) => {
            const active = isRouteActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onCloseMobile}
                title={collapsed ? item.label : undefined}
                aria-current={active ? "page" : undefined}
                className={`group flex items-center gap-3 rounded-soft-sm px-3 py-2.5 text-sm transition-colors ${
                  collapsed ? "justify-center px-0" : ""
                } ${
                  active
                    ? "bg-soft-tint font-medium text-forest"
                    : "text-ink/60 hover:bg-soft-muted hover:text-ink"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] shrink-0 ${
                    active ? "text-forest" : "text-ink/40 group-hover:text-ink/60"
                  }`}
                />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const footer = (
    <div className="space-y-1 px-3 pb-5">
      {collapsed && onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="Expand sidebar"
          className="hidden w-full items-center justify-center rounded-soft-sm py-2.5 text-ink/40 transition-colors hover:bg-soft-muted hover:text-ink lg:flex"
        >
          <ChevronsRight className="h-4 w-4" />
        </button>
      )}
      <button
        type="button"
        title={collapsed ? "Sign out" : undefined}
        onClick={() => {
          signOut();
          router.push("/login");
        }}
        className={`flex w-full items-center gap-3 rounded-soft-sm px-3 py-2.5 text-sm text-ink/55 transition-colors hover:bg-red-50 hover:text-red-700 ${
          collapsed ? "justify-center px-0" : ""
        }`}
      >
        <LogOut className="h-[18px] w-[18px] shrink-0" />
        {!collapsed && "Sign out"}
      </button>
    </div>
  );

  return (
    <>
      <aside
        className={`sticky top-0 hidden h-screen shrink-0 flex-col bg-soft-surface transition-[width] duration-200 lg:flex ${
          collapsed ? "w-[76px]" : "w-[248px]"
        }`}
      >
        {brandRow}
        {nav}
        {footer}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-[90] lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onCloseMobile}
            className="absolute inset-0 cursor-default bg-ink/50"
          />
          <aside className="relative flex h-full w-[264px] flex-col bg-soft-surface">
            {brandRow}
            {nav}
            {footer}
          </aside>
        </div>
      )}
    </>
  );
}
