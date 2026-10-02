import type { Database } from "@/lib/supabase/database.types";
import type { MockUser } from "./types";
import type { MentorApplication } from "./application-types";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type ApplicationRow = Database["public"]["Tables"]["mentor_applications"]["Row"];

export function mapProfile(row: ProfileRow): MockUser {
  return {
    id: row.id,
    email: row.email,
    fullName: row.full_name,
    matricNumber: row.matric_number,
    matricEditUnlocked: row.matric_edit_unlocked ?? false,
    role: row.role,
    mentorStatus: row.mentor_status,
    level: row.level ?? undefined,
    specialization: row.specialization ?? undefined,
    track: row.track ?? undefined,
    avatarInitials: row.avatar_initials ?? initialsFromName(row.full_name),
    bio: row.bio ?? undefined,
    createdAt: row.created_at,
  };
}

export function mapApplication(row: ApplicationRow): MentorApplication {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    email: row.email,
    matricNumber: row.matric_number,
    level: row.level,
    specialization: row.specialization,
    status: row.status,
    submittedAt: row.submitted_at,
    note: row.note ?? undefined,
  };
}

export function initialsFromName(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}
