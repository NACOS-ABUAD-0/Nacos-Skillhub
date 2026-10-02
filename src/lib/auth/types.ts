export type UserRole = "mentee" | "mentor" | "admin";

export type MentorStatus = "none" | "pending" | "approved" | "rejected";

export interface MockUser {
  id: string;
  email: string;
  fullName: string;
  matricNumber: string;
  /** A mentor has unlocked a one-time matric / JAMB number change. */
  matricEditUnlocked: boolean;
  role: UserRole;
  mentorStatus: MentorStatus;
  level?: string;
  specialization?: string;
  track?: string;
  avatarInitials: string;
  bio?: string;
  createdAt: string;
}

