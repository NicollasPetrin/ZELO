"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BarChart3,
  Building2,
  CheckSquare,
  CreditCard,
  Gauge,
  Goal,
  ListTodo,
  Settings,
  Users,
} from "lucide-react";
import type { SubscriptionPlan, UserRole } from "@prisma/client";
import { BrandLogo } from "@/components/brand-logo";
import { cn } from "@/lib/cn";
import { canManageCompany, canViewTeamArea } from "@/lib/permissions";
import { getPlanAccess, planDetails } from "@/lib/plans";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Gauge;
  roles: UserRole[];
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Painel", icon: Gauge, roles: ["OWNER", "MANAGER", "EMPLOYEE"] },
  { href: "/reports", label: "Relatorios", icon: BarChart3, roles: ["OWNER", "MANAGER"] },
  { href: "/my-tasks", label: "Minhas Tarefas", icon: CheckSquare, roles: ["OWNER", "MANAGER", "EMPLOYEE"] },
  { href: "/team-tasks", label: "Tarefas da Equipe", icon: ListTodo, roles: ["OWNER", "MANAGER"] },
  { href: "/departments", label: "Setores", icon: Building2, roles: ["OWNER", "MANAGER"] },
  { href: "/employees", label: "Funcionarios", icon: Users, roles: ["OWNER"] },
  { href: "/goals", label: "Metas", icon: Goal, roles: ["OWNER", "MANAGER", "EMPLOYEE"] },
  { href: "/notifications", label: "Notificacoes", icon: Bell, roles: ["OWNER", "MANAGER", "EMPLOYEE"] },
  { href: "/settings", label: "Configuracoes", icon: Settings, roles: ["OWNER"] },
];

export function Sidebar({ role, plan }: { role: UserRole; plan: SubscriptionPlan | null }) {
  const pathname = usePathname();
  const hasActiveSubscription = Boolean(plan);
  const visibleItems = navItems.filter((item) => item.roles.includes(role) && (hasActiveSubscription || item.href === "/settings"));
  const activePlan = plan ? planDetails[plan] : null;
  const access = getPlanAccess(plan);
  const maxUsersLabel = access.maxUsers === null ? "usuarios ilimitados" : `limite de ${access.maxUsers} usuarios`;
  const lockedSummary =
    !plan
      ? "Escolha um plano para liberar o produto"
      : plan === "BASIC"
      ? "Sem filtros avancados e desempenho"
      : plan === "MANAGEMENT"
        ? "Sem relatorios premium"
        : "Recursos avancados liberados";

  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white px-4 py-5 lg:block">
      <Link href="/dashboard" className="flex items-center gap-3 px-2">
        <BrandLogo variant="icon" decorative className="h-10 w-10" />
        <span>
          <span className="block text-base font-semibold text-slate-950">Zelo</span>
          <span className="block text-xs text-slate-500">Gestao simples da operacao</span>
        </span>
      </Link>

      <nav className="mt-8 space-y-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
                active ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="absolute inset-x-4 bottom-5 rounded-md border border-slate-200 bg-slate-50 p-3">
        <div className="mb-3 flex items-center gap-2 rounded-md bg-white px-2.5 py-2">
          <CreditCard className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          <div>
            <p className="text-xs font-medium text-slate-500">Assinatura</p>
            <p className="text-sm font-semibold text-slate-950">{activePlan ? `Plano ${activePlan.name}` : "Sem plano ativo"}</p>
          </div>
        </div>
        <p className="text-xs font-medium text-slate-500">Acesso atual</p>
        <p className="mt-1 text-sm font-semibold text-slate-950">
          {canManageCompany(role) ? "Controle total" : canViewTeamArea(role) ? "Gestao operacional" : "Rotina individual"}
        </p>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          {access.dashboardName} - {maxUsersLabel}. {lockedSummary}.
        </p>
      </div>
    </aside>
  );
}

export function MobileNavigation({
  role,
  hasActiveSubscription,
}: {
  role: UserRole;
  hasActiveSubscription: boolean;
}) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(role) && (hasActiveSubscription || item.href === "/settings"));

  return (
    <nav className="sticky top-16 z-10 border-b border-slate-200 bg-white/95 px-3 py-2 backdrop-blur lg:hidden" aria-label="Navegacao principal">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 min-w-20 shrink-0 flex-col items-center justify-center gap-1 rounded-md px-3 text-[11px] font-medium transition-colors",
                active ? "bg-slate-950 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="max-w-20 truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
