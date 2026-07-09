import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { buttonClassName } from "@/components/ui/button";
import { roleLabels } from "@/lib/labels";
import { planDetails } from "@/lib/plans";
import type { SubscriptionPlan, UserRole } from "@prisma/client";

export function Topbar({
  companyName,
  userName,
  role,
  plan,
  unreadCount,
}: {
  companyName: string;
  userName: string;
  role: UserRole;
  plan: SubscriptionPlan;
  unreadCount: number;
}) {
  const activePlan = planDetails[plan];

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-16 items-center justify-between gap-4 px-4 lg:px-8">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-normal text-slate-500">{companyName}</p>
          <p className="truncate text-sm font-semibold text-slate-950">{userName} - {roleLabels[role]}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="hidden rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 sm:inline-flex">
            Plano {activePlan.name}
          </span>
          <Link href="/notifications" className={buttonClassName("secondary", "sm")} aria-label="Abrir notificacoes">
            <Bell className="h-4 w-4" aria-hidden="true" />
            {unreadCount > 0 ? <span>{unreadCount}</span> : null}
          </Link>
          <form action={logoutAction}>
            <button className={buttonClassName("ghost", "sm")} type="submit" aria-label="Sair">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
