import { describe, expect, it } from "vitest";
import {
  canAccessTask,
  canManageCompany,
  canManageGoals,
  canManageTasks,
  canManageTeam,
  canViewTeamArea,
} from "./permissions";

describe("permissions", () => {
  it("keeps owner as the only critical settings and team manager", () => {
    expect(canManageCompany("OWNER")).toBe(true);
    expect(canManageTeam("OWNER")).toBe(true);
    expect(canManageCompany("MANAGER")).toBe(false);
    expect(canManageTeam("MANAGER")).toBe(false);
  });

  it("lets managers manage operational work, not company settings", () => {
    expect(canManageTasks("MANAGER")).toBe(true);
    expect(canManageGoals("MANAGER")).toBe(true);
    expect(canViewTeamArea("MANAGER")).toBe(true);
    expect(canManageCompany("MANAGER")).toBe(false);
  });

  it("limits employees to their own task access", () => {
    expect(canAccessTask("EMPLOYEE", "user-1", "user-1")).toBe(true);
    expect(canAccessTask("EMPLOYEE", "user-1", "user-2")).toBe(false);
    expect(canAccessTask("OWNER", "user-1", "user-2")).toBe(true);
  });
});
