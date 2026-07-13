import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  canAccessDashboard,
  getDashboardPath,
  isAuthenticationPath,
  isDashboardPath,
  isLaboratoryPath,
} from "./src/lib/auth/routing";

export async function proxy(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  if (isLaboratoryPath(pathname)) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (name: string, value: string, options) => {
          res.cookies.set({ name, value, ...options });
        },
        remove: (name: string, options) => {
          res.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  const { data } = await supabase.auth.getSession();
  const session = data.session;

  const redirectTo = (path: string) => {
    const response = NextResponse.redirect(new URL(path, req.url));

    res.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));

    return response;
  };

  if (!session) {
    if (pathname === "/login" || pathname === "/registro") {
      return res;
    }

    return redirectTo("/login");
  }

  let requiresMFA = false;
  try {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    requiresMFA = Boolean(
      aal?.nextLevel === "aal2" && aal?.currentLevel !== "aal2",
    );

    if (requiresMFA && pathname !== "/twoauth") {
      return redirectTo("/twoauth");
    }
  } catch {
    // Si falla la comprobación AAL, se conserva el acceso de una sesión válida.
  }

  const role = session.user.app_metadata?.role as number | undefined;
  const dashboardPath = getDashboardPath(role);

  if (pathname === "/twoauth") {
    return requiresMFA ? res : redirectTo(dashboardPath ?? "/403");
  }

  if (pathname === "/" || isAuthenticationPath(pathname)) {
    return redirectTo(dashboardPath ?? "/403");
  }

  if (isDashboardPath(pathname) && !canAccessDashboard(role, pathname)) {
    return redirectTo("/403");
  }

  return res;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/registro",
    "/twoauth",
    "/admin/:path*",
    "/profesor/:path*",
    "/estudiante/:path*",
  ],
};
