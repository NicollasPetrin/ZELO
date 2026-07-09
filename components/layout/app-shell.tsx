import type { ReactNode } from "react";
import { MobileNavigation, Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import type { SubscriptionPlan, UserRole } from "@prisma/client";

export function AppShell({
  children,
  companyName,
  userName,
  role,
  plan,
  unreadCount,
}: {
  children: ReactNode;
  companyName: string;
  userName: string;
  role: UserRole;
  plan: SubscriptionPlan;
  unreadCount: number;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={role} plan={plan} />
      <div className="lg:pl-72">
        <Topbar companyName={companyName} userName={userName} role={role} plan={plan} unreadCount={unreadCount} />
        <MobileNavigation role={role} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
