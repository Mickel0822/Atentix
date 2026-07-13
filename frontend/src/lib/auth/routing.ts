export type ApplicationRole = 1 | 2 | 3;

const dashboardPaths: Record<ApplicationRole, string> = {
  1: "/admin",
  2: "/profesor",
  3: "/estudiante",
};

export const laboratoryPaths = [
  "/laboratorio/reconocimiento",
  "/laboratorio/parpadeo",
  "/laboratorio/test-gemini",
] as const;

export function getDashboardPath(role: unknown): string | null {
  if (role === 1 || role === 2 || role === 3) {
    return dashboardPaths[role];
  }

  return null;
}

export function isDashboardPath(pathname: string): boolean {
  return ["/admin", "/profesor", "/estudiante"].some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function canAccessDashboard(role: unknown, pathname: string): boolean {
  const dashboardPath = getDashboardPath(role);

  return Boolean(
    dashboardPath &&
      (pathname === dashboardPath || pathname.startsWith(`${dashboardPath}/`)),
  );
}

export function isLaboratoryPath(pathname: string): boolean {
  return laboratoryPaths.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function isAuthenticationPath(pathname: string): boolean {
  return pathname === "/login" || pathname === "/registro" || pathname === "/twoauth";
}
