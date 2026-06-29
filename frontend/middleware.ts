import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => req.cookies.get(name)?.value,
        set: (
          name: string,
          value: string,
          options: {
            path?: string;
            domain?: string;
            maxAge?: number;
            httpOnly?: boolean;
            secure?: boolean;
            sameSite?: "strict" | "lax" | "none" | boolean;
          }
        ) => {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove: (name: string, options: { path?: string; domain?: string }) => {
          res.cookies.set({
            name,
            value: "",
            ...options,
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const pathname = req.nextUrl.pathname;

  // Si tiene sesión pero requiere MFA (AAL1 con nextLevel aal2), redirigir a /twoauth
  try {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (
      aal?.nextLevel === "aal2" &&
      aal?.currentLevel !== "aal2"
    ) {
      return NextResponse.redirect(new URL("/twoauth", req.url));
    }
  } catch {
    // Si falla la comprobación AAL, seguir (evitar bloquear al usuario)
  }

  // US-04: Control de acceso por rol (RBAC) - Recuperar el rol del usuario autenticado
  const role = session.user.app_metadata?.role as number | undefined;

  // US-04: 🔒 SOLO ADMIN (rol 1) - Restringir el acceso a rutas administrativas
  if (pathname.startsWith("/admin") && role !== 1) {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  // US-04: 🔒 SOLO PROFESOR (rol 2) - Restringir el acceso a rutas del cuerpo docente
  if (pathname.startsWith("/profesor") && role !== 2) {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  // US-04: 🔒 SOLO ESTUDIANTE (rol 3) - Restringir el acceso a la zona de estudiantes
  if (pathname.startsWith("/estudiante") && role !== 3) {
    return NextResponse.redirect(new URL("/403", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/profesor/:path*", "/estudiante/:path*"],
};
