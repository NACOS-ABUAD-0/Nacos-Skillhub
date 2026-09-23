"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { approveMentorApplication, rejectMentorApplication } from "@/lib/actions/mentor-applications";
import { mapApplication, mapProfile } from "./mappers";
import type { MentorApplication } from "./application-types";
import type { MockUser } from "./types";

export type { MentorApplication } from "./application-types";

interface SignUpInput {
  fullName: string;
  email: string;
  password: string;
  matricNumber: string;
  track?: string;
}

interface MentorApplyInput {
  fullName: string;
  email: string;
  matricNumber: string;
  level: string;
  specialization: string;
  /** Required only when applying without an existing signed-in account. */
  password?: string;
}

type ActionResult = { ok: boolean; error?: string; needsEmailConfirmation?: boolean };

interface AuthContextValue {
  user: MockUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<ActionResult>;
  signInAsDemo: (role: "mentee" | "mentor" | "admin") => Promise<ActionResult>;
  signUp: (input: SignUpInput) => Promise<ActionResult>;
  applyMentor: (input: MentorApplyInput) => Promise<ActionResult>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<MockUser>) => Promise<ActionResult>;
  getApplications: () => MentorApplication[];
  approveApplication: (id: string) => Promise<void>;
  rejectApplication: (id: string) => Promise<void>;
  getAllUsers: () => MockUser[];
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<MockUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [applications, setApplications] = useState<MentorApplication[]>([]);
  const [allUsers, setAllUsers] = useState<MockUser[]>([]);

  const loadProfile = useCallback(
    async (userId: string) => {
      const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
      if (data) setUser(mapProfile(data));
      return data;
    },
    [supabase]
  );

  const loadApplications = useCallback(async () => {
    const { data } = await supabase
      .from("mentor_applications")
      .select("*")
      .order("submitted_at", { ascending: false });
    setApplications((data ?? []).map(mapApplication));
  }, [supabase]);

  const loadAllUsers = useCallback(async () => {
    const { data } = await supabase.from("profiles").select("*");
    setAllUsers((data ?? []).map(mapProfile));
  }, [supabase]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!active) return;
      if (authUser) {
        await Promise.all([loadProfile(authUser.id), loadApplications(), loadAllUsers()]);
      }
      if (active) setIsLoading(false);
    }
    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user.id);
        loadApplications();
        loadAllUsers();
      } else {
        setUser(null);
        setApplications([]);
        setAllUsers([]);
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = useCallback(
    async (email: string, password: string): Promise<ActionResult> => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    [supabase]
  );

  const signInAsDemo = useCallback(
    async (role: "mentee" | "mentor" | "admin"): Promise<ActionResult> => {
      const { DEMO_ACCOUNTS, DEMO_PASSWORD } = await import("./demo-accounts");
      return signIn(DEMO_ACCOUNTS[role].email, DEMO_PASSWORD);
    },
    [signIn]
  );

  const signUp = useCallback(
    async (input: SignUpInput): Promise<ActionResult> => {
      const email = input.email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
          data: {
            full_name: input.fullName.trim(),
            matric_number: input.matricNumber.trim(),
            role: "mentee",
            mentor_status: "none",
            track: input.track ?? "Fullstack",
            level: "100L",
          },
        },
      });
      if (error) return { ok: false, error: error.message };
      if (data.session && data.user) {
        await loadProfile(data.user.id);
      }
      return { ok: true, needsEmailConfirmation: !data.session };
    },
    [supabase, loadProfile]
  );

  const applyMentor = useCallback(
    async (input: MentorApplyInput): Promise<ActionResult> => {
      const email = input.email.trim().toLowerCase();

      if (user) {
        if (user.role === "admin") {
          return { ok: false, error: "Admin accounts cannot apply as mentors." };
        }

        const { error: profileError } = await supabase
          .from("profiles")
          .update({
            role: "mentor",
            mentor_status: "pending",
            full_name: input.fullName.trim(),
            matric_number: input.matricNumber.trim(),
            level: input.level,
            specialization: input.specialization,
            track: input.specialization,
          })
          .eq("id", user.id);
        if (profileError) return { ok: false, error: profileError.message };

        const { error: appError } = await supabase.from("mentor_applications").insert({
          user_id: user.id,
          full_name: input.fullName.trim(),
          email: user.email,
          matric_number: input.matricNumber.trim(),
          level: input.level,
          specialization: input.specialization,
          status: "pending",
        });
        if (appError) return { ok: false, error: appError.message };

        await Promise.all([loadProfile(user.id), loadApplications()]);
        return { ok: true };
      }

      if (!input.password) {
        return { ok: false, error: "Choose a password to create your mentor account." };
      }

      // The signup trigger (handle_new_user) files the mentor_applications row
      // itself — it runs security-definer, so it works even before email
      // confirmation grants a session, when a client-side insert here couldn't.
      const { data, error } = await supabase.auth.signUp({
        email,
        password: input.password,
        options: {
          emailRedirectTo:
            typeof window !== "undefined" ? `${window.location.origin}/login` : undefined,
          data: {
            full_name: input.fullName.trim(),
            matric_number: input.matricNumber.trim(),
            role: "mentor",
            mentor_status: "pending",
            level: input.level,
            specialization: input.specialization,
            track: input.specialization,
          },
        },
      });
      if (error) return { ok: false, error: error.message };
      if (data.session && data.user) {
        await Promise.all([loadProfile(data.user.id), loadApplications()]);
      }
      return { ok: true, needsEmailConfirmation: !data.session };
    },
    [user, supabase, loadProfile, loadApplications]
  );

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setApplications([]);
    setAllUsers([]);
  }, [supabase]);

  const updateProfile = useCallback(
    async (patch: Partial<MockUser>): Promise<ActionResult> => {
      if (!user) return { ok: false, error: "Not signed in." };
      const dbPatch: Record<string, unknown> = {};
      if (patch.fullName !== undefined) dbPatch.full_name = patch.fullName;
      if (patch.bio !== undefined) dbPatch.bio = patch.bio;
      if (patch.track !== undefined) dbPatch.track = patch.track;
      if (patch.level !== undefined) dbPatch.level = patch.level;
      if (patch.specialization !== undefined) dbPatch.specialization = patch.specialization;

      setUser({ ...user, ...patch });
      const { error } = await supabase.from("profiles").update(dbPatch).eq("id", user.id);
      if (error) {
        await loadProfile(user.id);
        return { ok: false, error: error.message };
      }
      return { ok: true };
    },
    [supabase, user, loadProfile]
  );

  const getApplications = useCallback(() => applications, [applications]);
  const getAllUsers = useCallback(() => allUsers, [allUsers]);

  const approveApplication = useCallback(
    async (id: string) => {
      await approveMentorApplication(id);
      await Promise.all([loadApplications(), loadAllUsers()]);
      if (user) await loadProfile(user.id);
    },
    [loadApplications, loadAllUsers, loadProfile, user]
  );

  const rejectApplication = useCallback(
    async (id: string) => {
      await rejectMentorApplication(id);
      await Promise.all([loadApplications(), loadAllUsers()]);
      if (user) await loadProfile(user.id);
    },
    [loadApplications, loadAllUsers, loadProfile, user]
  );

  const refreshUser = useCallback(async () => {
    if (!user) return;
    await loadProfile(user.id);
  }, [user, loadProfile]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      signIn,
      signInAsDemo,
      signUp,
      applyMentor,
      signOut,
      updateProfile,
      getApplications,
      approveApplication,
      rejectApplication,
      getAllUsers,
      refreshUser,
    }),
    [
      user,
      isLoading,
      signIn,
      signInAsDemo,
      signUp,
      applyMentor,
      signOut,
      updateProfile,
      getApplications,
      approveApplication,
      rejectApplication,
      getAllUsers,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
