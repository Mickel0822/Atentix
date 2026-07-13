import { describe, expect, it } from "vitest";
import {
  canAccessDashboard,
  getDashboardPath,
  isAuthenticationPath,
  isDashboardPath,
  isLaboratoryPath,
} from "./routing";

describe("dashboard routing", () => {
  it("maps every application role to its dashboard", () => {
    expect(getDashboardPath(1)).toBe("/admin");
    expect(getDashboardPath(2)).toBe("/profesor");
    expect(getDashboardPath(3)).toBe("/estudiante");
  });

  it("rejects roles outside the application contract", () => {
    expect(getDashboardPath(undefined)).toBeNull();
    expect(getDashboardPath(4)).toBeNull();
  });

  it("allows each role only inside its own dashboard", () => {
    expect(canAccessDashboard(1, "/admin/usuarios")).toBe(true);
    expect(canAccessDashboard(2, "/profesor/reportes")).toBe(true);
    expect(canAccessDashboard(3, "/estudiante/clases")).toBe(true);
    expect(canAccessDashboard(2, "/admin")).toBe(false);
  });
});

describe("public route policy", () => {
  it("identifies dashboard, authentication and laboratory paths", () => {
    expect(isDashboardPath("/estudiante/resultados")).toBe(true);
    expect(isDashboardPath("/laboratorio/parpadeo")).toBe(false);
    expect(isAuthenticationPath("/login")).toBe(true);
    expect(isAuthenticationPath("/registro/confirmacion")).toBe(false);
    expect(isLaboratoryPath("/laboratorio/reconocimiento")).toBe(true);
    expect(isLaboratoryPath("/laboratorio/test-gemini/preview")).toBe(true);
  });
});
