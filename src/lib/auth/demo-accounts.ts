import type { UserRole } from "./types";

/**
 * Demo credentials for the one-click login chips on /login. Only active when
 * NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true *and* NEXT_PUBLIC_DEMO_PASSWORD is set,
 * and only work once the accounts exist (see scripts/seed-demo-users.mjs).
 *
 * The password is read from env rather than hard-coded: anything in this file
 * ships in the client bundle and the public repo, so a hard-coded password
 * would let anyone sign in as demo.admin wherever the seed script was run.
 * Never enable demo login, or seed these accounts, in production.
 */
export const DEMO_PASSWORD = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";

export const DEMO_LOGIN_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === "true" && DEMO_PASSWORD.length > 0;

export const DEMO_ACCOUNTS: Record<"mentee" | "mentor" | "admin", { email: string; role: UserRole }> = {
  mentee: { email: "demo.mentee@nacos.dev", role: "mentee" },
  mentor: { email: "demo.mentor@nacos.dev", role: "mentor" },
  admin: { email: "demo.admin@nacos.dev", role: "admin" },
};
