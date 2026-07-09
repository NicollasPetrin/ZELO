import type { UserRole } from "@prisma/client";

export const roleCapabilities: Record<UserRole, string[]> = {
  OWNER: ["company:manage", "team:manage", "tasks:manage", "goals:manage", "team:view"],
  MANAGER: ["tasks:manage", "goals:manage", "team:view"],
  EMPLOYEE: ["tasks:self", "goals:view", "notifications:view"],
};

export function isOwner(role: UserRole) {
  return role === "OWNER";
}

export function isManager(role: UserRole) {
  return role === "MANAGER";
}

export function isEmployee(role: UserRole) {
  return role === "EMPLOYEE";
}

export function canManageCompany(role: UserRole) {
  return role === "OWNER";
}

export function canManageTeam(role: UserRole) {
  return role === "OWNER";
}

export function canManageGoals(role: UserRole) {
  return role === "OWNER" || role === "MANAGER";
}

export function canManageTasks(role: UserRole) {
  return role === "OWNER" || role === "MANAGER";
}

export function canViewTeamArea(role: UserRole) {
  return role === "OWNER" || role === "MANAGER";
}

export function hasRole(role: UserRole, allowedRoles: UserRole[]) {
  return allowedRoles.includes(role);
}

export function canAccessTask(role: UserRole, userId: string, assigneeId: string) {
  return canManageTasks(role) || userId === assigneeId;
}
