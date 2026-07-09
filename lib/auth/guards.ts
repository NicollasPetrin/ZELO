import "server-only";
import type { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";
import { requireUser, type CurrentUser } from "@/lib/auth/session";
import {
  canManageCompany,
  canManageGoals,
  canManageTasks,
  canManageTeam,
  canViewTeamArea,
  hasRole,
} from "@/lib/permissions";

export async function requireRole(allowedRoles: UserRole[], redirectTo = "/dashboard") {
  const user = await requireUser();

  if (!hasRole(user.role, allowedRoles)) {
    redirect(redirectTo);
  }

  return user;
}

export async function requireTeamArea() {
  const user = await requireUser();

  if (!canViewTeamArea(user.role)) {
    redirect("/my-tasks");
  }

  return user;
}

export async function requireCompanyManager() {
  return requireRole(["OWNER"]);
}

export function assertCanManageCompany(user: CurrentUser) {
  if (!canManageCompany(user.role)) {
    throw new Error("Apenas o dono pode gerenciar configuracoes criticas da empresa.");
  }
}

export function assertCanManageTeam(user: CurrentUser) {
  if (!canManageTeam(user.role)) {
    throw new Error("Apenas o dono pode gerenciar funcionarios.");
  }
}

export function assertCanManageTasks(user: CurrentUser) {
  if (!canManageTasks(user.role)) {
    throw new Error("Apenas dono ou gerente podem gerenciar tarefas da equipe.");
  }
}

export function assertCanManageGoals(user: CurrentUser) {
  if (!canManageGoals(user.role)) {
    throw new Error("Apenas dono ou gerente podem gerenciar metas.");
  }
}
