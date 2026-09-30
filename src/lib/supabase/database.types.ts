// Hand-written to match supabase/migrations/ (0001–0003).
// Once the project is provisioned, prefer regenerating with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/database.types.ts
//
// IMPORTANT: @supabase/supabase-js >=2.50 has a known type-inference bug
// where a custom Database generic (hand-written or CLI-generated) makes
// every `.select()/.insert()/.update()` resolve to `never` (see
// supabase/supabase-js#1483, #1738). package.json intentionally pins
// @supabase/supabase-js to 2.49.4 and @supabase/ssr to 0.5.2, the last
// combo confirmed to type-check correctly. Don't `npm update` these two
// packages without re-verifying `npx tsc --noEmit` stays clean.

export type UserRole = "mentee" | "mentor" | "admin";
export type MentorStatus = "none" | "pending" | "approved" | "rejected";
export type ApplicationStatus = "pending" | "approved" | "rejected";
export type MatchStatus = "requested" | "active" | "ended";
export type MilestoneStatus = "locked" | "current" | "completed";
export type SessionMode = "Async" | "Live call" | "Office hours";
export type SessionStatus = "Upcoming" | "Completed";
export type ReviewPriority = "High" | "Normal";
export type ReviewStatus = "Pending" | "In review" | "Done";
export type SubmissionStatus = "submitted" | "changes_requested" | "approved";
export type Availability = "Open" | "Limited" | "Full";

// Each table's Row is defined standalone (never via `Database["public"]...`)
// so postgrest-js's generic Insert/Update helpers don't have to resolve a
// self-referential type — that pattern makes them collapse to `never`.

interface ProfileRow {
  id: string;
  email: string;
  full_name: string;
  matric_number: string;
  role: UserRole;
  mentor_status: MentorStatus;
  level: string | null;
  specialization: string | null;
  track: string | null;
  bio: string | null;
  avatar_initials: string | null;
  created_at: string;
}

interface TrackRow {
  id: string;
  name: string;
  color: string | null;
  created_at: string;
}

interface MentorApplicationRow {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  matric_number: string;
  level: string;
  specialization: string;
  note: string | null;
  status: ApplicationStatus;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

interface MentorMetaRow {
  user_id: string;
  rating: number | null;
  mentees_count: number;
  availability: Availability;
  tags: string[];
  headline: string | null;
  updated_at: string;
}

interface MenteeMentorMatchRow {
  id: string;
  mentee_id: string;
  mentor_id: string;
  match_score: number | null;
  status: MatchStatus;
  created_at: string;
}

interface QuizSubmissionRow {
  id: string;
  mentee_id: string;
  answers: Record<string, unknown>;
  recommended_track: string;
  submitted_at: string;
}

interface MilestoneTemplateRow {
  id: string;
  track: string | null;
  title: string;
  description: string | null;
  order_index: number;
  due_label: string | null;
  pr_required: boolean;
}

interface MenteeMilestoneRow {
  id: string;
  mentee_id: string;
  mentor_id: string | null;
  template_id: string | null;
  title: string;
  description: string | null;
  status: MilestoneStatus;
  due_label: string | null;
  pr_required: boolean;
  updated_at: string;
}

interface CertificateTemplateRow {
  id: string;
  title: string;
  track: string | null;
  description: string | null;
}

interface IssuedCertificateRow {
  id: string;
  mentee_id: string;
  template_id: string | null;
  title: string;
  track: string | null;
  signed_by: string | null;
  issued_at: string;
  issued_by: string | null;
}


interface MessageThreadRow {
  id: string;
  participant_a: string;
  participant_b: string;
  created_at: string;
}

interface MessageRow {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
}

interface SessionRow {
  id: string;
  mentor_id: string;
  mentee_id: string | null;
  title: string;
  scheduled_at: string | null;
  mode: SessionMode;
  status: SessionStatus;
  created_at: string;
}

interface PrReviewRow {
  id: string;
  mentee_id: string;
  mentor_id: string;
  title: string;
  repo_url: string;
  priority: ReviewPriority;
  status: ReviewStatus;
  submitted_at: string;
}

interface MiniProjectRow {
  id: string;
  track: string;
  title: string;
  description: string | null;
  week_number: number;
  opens_at: string | null;
  due_at: string | null;
  resource_url: string | null;
  created_by: string | null;
  created_at: string;
}

interface MiniProjectSubmissionRow {
  id: string;
  project_id: string;
  mentee_id: string;
  repo_url: string;
  demo_url: string | null;
  notes: string | null;
  status: SubmissionStatus;
  mentor_feedback: string | null;
  submitted_at: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
}

type TableDef<Row, RequiredInsertKeys extends keyof Row> = {
  Row: Row;
  Insert: Partial<Row> & Pick<Row, RequiredInsertKeys>;
  Update: Partial<Row>;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: TableDef<ProfileRow, "id" | "email">;
      tracks: TableDef<TrackRow, "name">;
      mentor_applications: TableDef<
        MentorApplicationRow,
        "user_id" | "full_name" | "email" | "matric_number" | "level" | "specialization"
      >;
      mentor_meta: TableDef<MentorMetaRow, "user_id">;
      mentee_mentor_matches: TableDef<MenteeMentorMatchRow, "mentee_id" | "mentor_id">;
      quiz_submissions: TableDef<QuizSubmissionRow, "mentee_id" | "answers" | "recommended_track">;
      milestone_templates: TableDef<MilestoneTemplateRow, "title">;
      mentee_milestones: TableDef<MenteeMilestoneRow, "mentee_id" | "title">;
      certificate_templates: TableDef<CertificateTemplateRow, "title">;
      issued_certificates: TableDef<IssuedCertificateRow, "mentee_id" | "title">;
      message_threads: TableDef<MessageThreadRow, "participant_a" | "participant_b">;
      messages: TableDef<MessageRow, "thread_id" | "sender_id" | "body">;
      sessions: TableDef<SessionRow, "mentor_id" | "title">;
      pr_reviews: TableDef<PrReviewRow, "mentee_id" | "mentor_id" | "title" | "repo_url">;
      mini_projects: TableDef<MiniProjectRow, "track" | "title" | "week_number">;
      mini_project_submissions: TableDef<
        MiniProjectSubmissionRow,
        "project_id" | "mentee_id" | "repo_url"
      >;
    };
    Views: Record<string, never>;
    Functions: {
      apply_as_mentor: {
        Args: {
          p_full_name: string;
          p_matric_number: string;
          p_level: string;
          p_specialization: string;
        };
        Returns: undefined;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
