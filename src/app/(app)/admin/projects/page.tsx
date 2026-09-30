"use client";

import { PageShell } from "@/components/app/ui";
import { MiniProjectManager } from "@/components/app/MiniProjectManager";

export default function AdminProjectsPage() {
  return (
    <PageShell
      title="Weekly mini-projects"
      description="Assign a project per track each week for mentees to solve and submit."
    >
      <MiniProjectManager />
    </PageShell>
  );
}
