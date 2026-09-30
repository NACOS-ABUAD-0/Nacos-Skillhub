import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const ROLE_PREFIXES = ["/admin", "/mentor", "/mentee"] as const;

function dashboardPathForRole(role: string, mentorStatus: string) {
  if (role === "admin") return "/admin/dashboard";
  if (role === "mentor") {
    return mentorStatus === "pending" || mentorStatus === "rejected"
      ? "/mentor/application"
      : "/mentor/dashboard";
  }
  return "/mentee/dashboard";
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  // /mentor/apply lives in the (auth) route group (public application form,
  // not the protected mentor desk) even though it shares the /mentor prefix.
  const isPublicMentorApply = path.startsWith("/mentor/apply");
  const matchedRole = isPublicMentorApply
    ? undefined
    : ROLE_PREFIXES.find((prefix) => path.startsWith(prefix))?.slice(1);

  if (matchedRole) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return NextResponse.redirect(url);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role, mentor_status")
      .eq("id", user.id)
      .single();

    const role = profile?.role ?? "mentee";
    const mentorStatus = profile?.mentor_status ?? "none";

    if (role !== matchedRole) {
      const url = request.nextUrl.clone();
      url.pathname = dashboardPathForRole(role, mentorStatus);
      return NextResponse.redirect(url);
    }

    if (
      matchedRole === "mentor" &&
      (mentorStatus === "pending" || mentorStatus === "rejected") &&
      !path.startsWith("/mentor/application") &&
      !path.startsWith("/mentor/settings")
    ) {
      const url = request.nextUrl.clone();
      url.pathname = "/mentor/application";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|images/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
