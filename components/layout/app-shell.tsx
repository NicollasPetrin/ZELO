import type { ReactNode } from "react";
import { MobileNavigation, Sidebar } from "@/components/layout/sidebar";
import { SubscriptionGate } from "@/components/layout/subscription-gate";
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
  plan: SubscriptionPlan | null;
  unreadCount: number;
}) {
  const hasActiveSubscription = Boolean(plan);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar role={role} plan={plan} />
      <div className="lg:pl-72">
        <Topbar companyName={companyName} userName={userName} role={role} plan={plan} unreadCount={unreadCount} />
        <MobileNavigation role={role} hasActiveSubscription={hasActiveSubscription} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          <SubscriptionGate hasActiveSubscription={hasActiveSubscription}>{children}</SubscriptionGate>
        </main>
      </div>
    </div>
  );
}
