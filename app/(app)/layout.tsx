import type { ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ensureSubscriptionReminder } from "@/features/billing/subscription-reminder";
import { countUnreadNotifications } from "@/features/notifications/data";
import { requireUser } from "@/lib/auth/session";
import { getActivePlanCode } from "@/lib/subscription";

export default async function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  // O lembrete nasce no acesso a aplicacao, e nao em um agendador, porque a
  // notificacao e interna: so tem efeito quando o usuario esta aqui. A propria
  // funcao garante no maximo um lembrete por 24h. Falhar aqui nunca pode
  // derrubar a pagina, entao o erro e registrado e engolido.
  try {
    await ensureSubscriptionReminder(user);
  } catch (error) {
    console.error("[subscription-reminder] falha ao criar lembrete:", error);
  }

  const unreadCount = await countUnreadNotifications(user);
  const activePlan = getActivePlanCode(user.company);

  return (
    <AppShell companyName={user.company.name} userName={user.name} role={user.role} plan={activePlan} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
