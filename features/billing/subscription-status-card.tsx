import { AlertTriangle, CalendarClock, CalendarX2, CircleCheck, ShieldOff } from "lucide-react";
import { GRACE_PERIOD_DAYS, type SubscriptionWindow } from "@/lib/subscription";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function pluralizeDays(days: number) {
  return days === 1 ? "1 dia" : `${days} dias`;
}

type Estilo = {
  container: string;
  destaque: string;
  icone: typeof CalendarClock;
  rotulo: string;
  titulo: string;
  detalhe: string;
};

function buildEstilo(window: SubscriptionWindow): Estilo {
  if (window.phase === "ended") {
    return {
      container: "border-slate-300 bg-slate-100",
      destaque: "text-slate-800",
      icone: CalendarX2,
      rotulo: "Assinatura encerrada",
      titulo: "Funcionalidades bloqueadas",
      detalhe: "O cancelamento foi concluido e o periodo contratado terminou. Contrate um plano para voltar a usar.",
    };
  }

  // Um cancelamento agendado vem antes de qualquer outra leitura: enquanto ele
  // existe, dizer "assinatura em dia" ou "vencimento proximo" seria mentir
  // sobre o que acontece na data.
  if (window.cancelAtPeriodEnd && window.daysRemaining !== null) {
    return {
      container: "border-amber-200 bg-amber-50",
      destaque: "text-amber-900",
      icone: CalendarX2,
      rotulo: "Cancelamento agendado",
      titulo: `${pluralizeDays(window.daysRemaining)} de acesso`,
      detalhe: window.isTrial
        ? "O teste foi cancelado e nenhuma cobranca sera feita. Nesta data o acesso termina."
        : "Nenhuma nova cobranca sera feita. Nesta data o acesso termina.",
    };
  }

  if (window.phase === "suspended") {
    return {
      container: "border-rose-200 bg-rose-50",
      destaque: "text-rose-800",
      icone: ShieldOff,
      rotulo: "Assinatura suspensa",
      titulo: "Funcionalidades bloqueadas",
      detalhe:
        window.daysOverdue !== null
          ? `Pagamento em atraso ha ${pluralizeDays(window.daysOverdue)}. Regularize para liberar o acesso.`
          : "Regularize o pagamento para liberar o acesso.",
    };
  }

  if (window.phase === "grace" && window.daysOverdue !== null) {
    const restantes = Math.max(0, GRACE_PERIOD_DAYS - window.daysOverdue);

    return {
      container: "border-rose-200 bg-rose-50",
      destaque: "text-rose-800",
      icone: AlertTriangle,
      rotulo: "Pagamento em atraso",
      titulo: restantes === 0 ? "Bloqueio iminente" : `Bloqueio em ${pluralizeDays(restantes)}`,
      detalhe: `Venceu ha ${pluralizeDays(window.daysOverdue)}. O acesso continua liberado durante a tolerancia.`,
    };
  }

  if (window.isTrial && window.daysRemaining !== null) {
    const acabando = window.daysRemaining <= 5;

    return {
      container: acabando ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50",
      destaque: acabando ? "text-amber-900" : "text-emerald-800",
      icone: acabando ? AlertTriangle : CircleCheck,
      rotulo: "Teste gratuito",
      titulo: `${pluralizeDays(window.daysRemaining)} restantes`,
      detalhe: "Ao terminar, a primeira cobranca entra automaticamente e o acesso continua.",
    };
  }

  if (window.phase === "expiring" && window.daysRemaining !== null) {
    return {
      container: "border-amber-200 bg-amber-50",
      destaque: "text-amber-900",
      icone: AlertTriangle,
      rotulo: "Vencimento proximo",
      titulo: `${pluralizeDays(window.daysRemaining)} restantes`,
      detalhe: `Apos o vencimento ha ${pluralizeDays(GRACE_PERIOD_DAYS)} de tolerancia antes do bloqueio.`,
    };
  }

  if (window.phase === "active" && window.daysRemaining !== null) {
    return {
      container: "border-emerald-200 bg-emerald-50",
      destaque: "text-emerald-800",
      icone: CircleCheck,
      rotulo: "Assinatura em dia",
      titulo: `${pluralizeDays(window.daysRemaining)} restantes`,
      detalhe: "Nenhuma acao necessaria no momento.",
    };
  }

  return {
    container: "border-slate-200 bg-slate-50",
    destaque: "text-slate-700",
    icone: CalendarClock,
    rotulo: "Sem assinatura ativa",
    titulo: "Nenhum periodo em vigor",
    detalhe: "Escolha um plano para liberar as funcionalidades.",
  };
}

export function SubscriptionStatusCard({ window }: { window: SubscriptionWindow }) {
  const estilo = buildEstilo(window);
  const Icone = estilo.icone;

  return (
    <div className={`rounded-md border p-4 ${estilo.container}`}>
      <div className={`flex items-center gap-2 text-sm font-semibold ${estilo.destaque}`}>
        <Icone className="h-4 w-4" aria-hidden="true" />
        {estilo.rotulo}
      </div>
      <p className={`mt-2 text-2xl font-semibold leading-8 ${estilo.destaque}`}>{estilo.titulo}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{estilo.detalhe}</p>
      {window.endsAt ? (
        <p className="mt-2 text-xs leading-5 text-slate-600">
          {window.cancelAtPeriodEnd
            ? window.daysRemaining !== null
              ? "Termina em"
              : "Terminou em"
            : window.daysRemaining !== null
              ? "Vence em"
              : "Venceu em"}{" "}
          {formatDate(window.endsAt)}
        </p>
      ) : null}
    </div>
  );
}
