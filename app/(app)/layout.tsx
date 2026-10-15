import type { ReactNode } from "react";
import { companyLogoUrl } from "@/components/company-avatar";
import { AppShell } from "@/components/layout/app-shell";
import { ensureSubscriptionReminder } from "@/features/billing/subscription-reminder";
import { countUnreadConversations } from "@/features/chat/data";
import { getSidebarSpaces } from "@/features/layout/data";
import { countUnreadNotifications } from "@/features/notifications/data";
import { requireUser } from "@/lib/auth/session";
import { canViewTeamArea } from "@/lib/permissions";
import { getPlanAccess } from "@/lib/plans";
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

  const activePlan = getActivePlanCode(user.company);
  // Setores como espacos so para quem gerencia equipe, e a partir do Plano
  // Gestao: e o mesmo recorte do filtro por setor nas tarefas da equipe.
  const mostraEspacos = canViewTeamArea(user.role) && getPlanAccess(activePlan).canUseAdvancedFilters;
  const [unreadCount, chatUnread, spaces] = await Promise.all([
    countUnreadNotifications(user),
    countUnreadConversations(user),
    mostraEspacos ? getSidebarSpaces(user) : null,
  ]);

  return (
    <AppShell
      userName={user.name}
      sidebar={{
        role: user.role,
        plan: activePlan,
        companyName: user.company.name,
        logoUrl: companyLogoUrl(user.company),
        inboxUnread: unreadCount,
        chatUnread,
        spaces,
      }}
    >
      {children}
    </AppShell>
  );
}
