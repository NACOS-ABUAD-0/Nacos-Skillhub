// One-off script: creates the three demo accounts used by the "Enter as
// Mentee/Mentor/Admin" chips on /login (only shown when
// NEXT_PUBLIC_ENABLE_DEMO_LOGIN=true). Safe to re-run — skips accounts that
// already exist.
//
// Local/dev projects only — never run this against production: it creates an
// admin account whose email is public in this repo.
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... DEMO_PASSWORD=... //     node scripts/seed-demo-users.mjs
//
// Use the same value for NEXT_PUBLIC_DEMO_PASSWORD in .env.local.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;

if (!url || !serviceKey || !DEMO_PASSWORD) {
  console.error(
    "Set NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and DEMO_PASSWORD before running this script."
  );
  process.exit(1);
}

if (DEMO_PASSWORD.length < 12) {
  console.error("DEMO_PASSWORD must be at least 12 characters.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const accounts = [
  {
    email: "demo.mentee@nacos.dev",
    metadata: {
      full_name: "Demo Mentee",
      matric_number: "DEMO/MENTEE/001",
      role: "mentee",
      mentor_status: "none",
      track: "Fullstack",
      level: "200L",
    },
  },
  {
    email: "demo.mentor@nacos.dev",
    metadata: {
      full_name: "Demo Mentor",
      matric_number: "DEMO/MENTOR/001",
      role: "mentee", // created as mentee to skip the applicant trigger, promoted below
    },
    promoteTo: {
      role: "mentor",
      mentor_status: "approved",
      level: "400L",
      specialization: "Fullstack",
      track: "Fullstack",
    },
  },
  {
    email: "demo.admin@nacos.dev",
    metadata: {
      full_name: "Demo Admin",
      matric_number: "DEMO/ADMIN/001",
      role: "mentee",
    },
    promoteTo: { role: "admin" },
  },
];

for (const account of accounts) {
  const { data: existing } = await admin
    .from("profiles")
    .select("id")
    .eq("email", account.email)
    .maybeSingle();

  let userId = existing?.id;

  if (!userId) {
    const { data, error } = await admin.auth.admin.createUser({
      email: account.email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: account.metadata,
    });
    if (error) {
      console.error(`Failed to create ${account.email}:`, error.message);
      continue;
    }
    userId = data.user.id;
    console.log(`Created ${account.email}`);
  } else {
    console.log(`${account.email} already exists, skipping create`);
  }

  if (account.promoteTo && userId) {
    const { error } = await admin.from("profiles").update(account.promoteTo).eq("id", userId);
    if (error) console.error(`Failed to promote ${account.email}:`, error.message);
    else console.log(`Promoted ${account.email} ->`, account.promoteTo);
  }
}

console.log("Done. Demo accounts use the DEMO_PASSWORD you provided.");
