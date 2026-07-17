import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { DataTable, Td, Th } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { SubscriptionRequiredCard } from "@/components/subscription-required-card";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { markAllNotificationsReadAction, markNotificationReadAction } from "@/features/notifications/actions";
import { listNotifications } from "@/features/notifications/data";
import { requireUser } from "@/lib/auth/session";
import { formatDateTime } from "@/lib/format";
import { notificationLabels } from "@/lib/labels";
import { getActivePlanCode } from "@/lib/subscription";

export default async function NotificationsPage() {
  const user = await requireUser();
  if (!getActivePlanCode(user.company)) {
    return <SubscriptionRequiredCard />;
  }

  const notifications = await listNotifications(user);

  const unreadCount = notifications.filter((notification) => !notification.isRead).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Notificacoes"
        description="Acompanhe eventos importantes sobre tarefas, comentarios, prazos e metas."
        actions={
          unreadCount > 0 ? (
            <form
              action={async () => {
                "use server";
                await markAllNotificationsReadAction();
              }}
            >
              <button className={buttonClassName("secondary")} type="submit">
                <CheckCheck className="h-4 w-4" />
                Marcar todas como lidas
              </button>
            </form>
          ) : null
        }
      />

      {notifications.length ? (
        <DataTable>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Notificacao</Th>
                <Th>Tipo</Th>
                <Th>Status</Th>
                <Th>Data</Th>
                <Th>Acoes</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {notifications.map((notification) => (
                <tr key={notification.id}>
                  <Td>
                    <div className="flex items-start gap-3">
                      <Bell className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-slate-950">{notification.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{notification.message}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>{notificationLabels[notification.type]}</Td>
                  <Td>
                    <Badge className={notification.isRead ? "bg-slate-100 text-slate-600" : "bg-sky-100 text-sky-800"}>
                      {notification.isRead ? "Lida" : "Nao lida"}
                    </Badge>
                  </Td>
                  <Td>{formatDateTime(notification.createdAt)}</Td>
                  <Td>
                    <div className="flex flex-wrap gap-2">
                      {notification.link ? (
                        <Link href={notification.link} className={buttonClassName("secondary", "sm")}>
                          Abrir
                        </Link>
                      ) : null}
                      {!notification.isRead ? (
                        <form
                          action={async () => {
                            "use server";
                            await markNotificationReadAction(notification.id);
                          }}
                        >
                          <button className={buttonClassName("ghost", "sm")} type="submit">
                            Marcar lida
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      ) : (
        <EmptyState
          title="Sem notificacoes"
          description="Eventos como nova tarefa, comentario, atraso e meta em atencao aparecerao aqui."
        />
      )}
    </div>
  );
}
