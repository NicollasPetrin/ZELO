import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { countUnreadNotifications } from "@/features/notifications/data";
import { requireUser } from "@/lib/auth/session";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();
  const unreadCount = await countUnreadNotifications(user.id);

  return (
    <AppShell companyName={user.company.name} userName={user.name} role={user.role} plan={user.company.plan} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
