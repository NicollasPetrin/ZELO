import type { ReactNode } from "react";
import { Sidebar, type SidebarProps } from "@/components/layout/sidebar";
import { SubscriptionGate } from "@/components/layout/subscription-gate";
import { Topbar } from "@/components/layout/topbar";

export function AppShell({
  children,
  userName,
  sidebar,
}: {
  children: ReactNode;
  userName: string;
  sidebar: SidebarProps;
}) {
  const hasActiveSubscription = Boolean(sidebar.plan);

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar {...sidebar} />
      <div className="lg:pl-72">
        <Topbar userName={userName} sidebar={sidebar} />
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">
          <SubscriptionGate hasActiveSubscription={hasActiveSubscription}>{children}</SubscriptionGate>
        </main>
      </div>
    </div>
  );
}
