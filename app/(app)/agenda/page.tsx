import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CalendarConnection } from "@/features/calendar/calendar-connection";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { isGoogleCalendarConfigured } from "@/lib/env";

const avisos: Record<string, { tom: "ok" | "erro"; texto: string }> = {
  conectado: { tom: "ok", texto: "Agenda conectada. Suas proximas tarefas aparecem nela automaticamente." },
  recusado: { tom: "erro", texto: "A permissao foi recusada no Google. Nada foi conectado." },
  "estado-invalido": {
    tom: "erro",
    texto: "O retorno do Google nao conferiu com o pedido que saiu daqui. Tente conectar de novo.",
  },
  "sem-codigo": { tom: "erro", texto: "O Google nao devolveu o codigo de autorizacao. Tente de novo." },
  "sem-refresh": {
    tom: "erro",
    texto:
      "O Google nao devolveu a autorizacao de longo prazo. Remova o acesso da Zelo na sua Conta Google e conecte novamente.",
  },
  indisponivel: { tom: "erro", texto: "A integracao com o Google Agenda ainda nao foi configurada." },
  falhou: { tom: "erro", texto: "Nao foi possivel concluir a conexao. Tente de novo em instantes." },
};

export default async function AgendaPage({ searchParams }: { searchParams: Promise<{ google?: string }> }) {
  const user = await requireUser();
  const params = await searchParams;
  const aviso = params.google ? avisos[params.google] : null;

  const [conta, tarefasNaAgenda] = await Promise.all([
    prisma.googleCalendarAccount.findUnique({
      where: { userId: user.id },
      select: { googleEmail: true, createdAt: true },
    }),
    prisma.taskCalendarEvent.count({ where: { userId: user.id } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Agenda"
        description="Ligue a Zelo ao seu Google Agenda e receba cada tarefa como compromisso, com prazo, prioridade e o que precisa ser feito."
      />

      {aviso ? (
        <p
          className={
            aviso.tom === "ok"
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm leading-6 text-emerald-900"
              : "rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950"
          }
        >
          {aviso.texto}
        </p>
      ) : null}

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-950">
          <CalendarClock className="h-4 w-4 text-emerald-700" aria-hidden="true" />
          Google Agenda
        </h2>
        <div className="mt-4">
          <CalendarConnection
            connected={Boolean(conta)}
            googleEmail={conta?.googleEmail ?? null}
            disponivel={isGoogleCalendarConfigured()}
          />
        </div>
      </section>

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Como funciona</h2>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-600">
          <li>Toda tarefa atribuida a voce vira um compromisso que termina na hora do prazo.</li>
          <li>O titulo leva a prioridade; a descricao leva o que fazer, o setor, quem pediu e o link da tarefa.</li>
          <li>Voce recebe aviso na vespera e uma hora antes do prazo.</li>
          <li>Mudou o prazo ou a prioridade, o compromisso muda junto. Concluiu ou cancelou, ele sai da agenda.</li>
          <li>A conexao e sua: o dono da empresa nao liga nem desliga a agenda de ninguem.</li>
        </ul>
        {conta ? (
          <p className="mt-4 text-xs text-slate-500">
            {tarefasNaAgenda === 0
              ? "Nenhuma tarefa na agenda ainda. Use o botao acima para enviar as que ja estao em aberto."
              : `${tarefasNaAgenda} tarefa(s) sua(s) estao na agenda agora.`}
          </p>
        ) : null}
      </section>
    </div>
  );
}
