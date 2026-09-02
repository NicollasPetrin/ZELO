import type { SubscriptionPlan } from "@prisma/client";

export const NO_ACTIVE_SUBSCRIPTION_MESSAGE =
  "Sua empresa ainda nao possui assinatura ativa. Escolha um plano para liberar as funcionalidades.";

export const SUBSCRIPTION_SUSPENDED_MESSAGE =
  "A assinatura esta suspensa por falta de pagamento. Regularize para liberar as funcionalidades novamente.";

export const SUBSCRIPTION_ENDED_MESSAGE =
  "A assinatura foi cancelada e o periodo contratado terminou. Contrate um plano para voltar a usar as funcionalidades.";

/** A partir de quantos dias antes do vencimento o cliente comeca a ser lembrado. */
export const REMINDER_WINDOW_DAYS = 5;

/** Quantos dias de atraso sao tolerados antes de suspender o acesso. */
export const GRACE_PERIOD_DAYS = 2;

/** Duracao do teste gratuito. A primeira cobranca cai no fim dele. */
export const TRIAL_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;

export type SubscriptionPhase =
  /** Nunca houve assinatura, ou ela nao esta mais carregada. */
  | "none"
  /** Em dia, com folga maior que a janela de lembrete. */
  | "active"
  /** Em dia, mas vencendo em REMINDER_WINDOW_DAYS dias ou menos. */
  | "expiring"
  /** Vencida, ainda dentro dos dias de tolerancia. */
  | "grace"
  /** Vencida alem da tolerancia: acesso suspenso. */
  | "suspended"
  /** Cancelada pelo cliente e com o periodo contratado ja terminado. */
  | "ended";

export type SubscriptionWindow = {
  phase: SubscriptionPhase;
  /** Periodo de teste gratuito, ainda sem nenhuma cobranca paga. */
  isTrial: boolean;
  /** Cancelada pelo cliente, ainda valendo ate o fim do periodo ja pago. */
  cancelAtPeriodEnd: boolean;
  endsAt: Date | null;
  /** Dias inteiros ate o vencimento. Null quando ja venceu ou nao ha assinatura. */
  daysRemaining: number | null;
  /** Dias inteiros de atraso. Null quando ainda nao venceu. */
  daysOverdue: number | null;
  /** Se as funcionalidades do plano devem estar liberadas. */
  hasAccess: boolean;
  /** Se o cliente deve ser lembrado de pagar. */
  shouldRemind: boolean;
};

type SubscriptionShape = {
  currentPeriodEnd: Date | string;
  status?: string;
  cancelAtPeriodEnd?: boolean;
  plan: {
    code: SubscriptionPlan;
  };
};

type ActivePlanCompany = {
  subscriptions?: Array<SubscriptionShape>;
};

const noSubscription: SubscriptionWindow = {
  phase: "none",
  isTrial: false,
  cancelAtPeriodEnd: false,
  endsAt: null,
  daysRemaining: null,
  daysOverdue: null,
  hasAccess: false,
  shouldRemind: false,
};

/**
 * Traduz o vencimento da assinatura nas fases que a aplicacao usa para decidir
 * acesso e lembrete. Funcao pura: o "agora" e injetado para poder ser testado.
 */
export function getSubscriptionWindow(company: ActivePlanCompany, now: Date = new Date()): SubscriptionWindow {
  const subscription = company.subscriptions?.[0];

  if (!subscription) {
    return noSubscription;
  }

  const endsAt = new Date(subscription.currentPeriodEnd);

  if (Number.isNaN(endsAt.getTime())) {
    return noSubscription;
  }

  const isTrial = subscription.status === "TRIALING";
  const cancelAtPeriodEnd = subscription.cancelAtPeriodEnd === true;
  const diffMs = endsAt.getTime() - now.getTime();

  if (diffMs > 0) {
    // Arredonda para cima: faltando 30 minutos, ainda resta "1 dia" para o cliente.
    const daysRemaining = Math.ceil(diffMs / DAY_MS);

    return {
      phase: daysRemaining <= REMINDER_WINDOW_DAYS ? "expiring" : "active",
      isTrial,
      cancelAtPeriodEnd,
      endsAt,
      daysRemaining,
      daysOverdue: null,
      hasAccess: true,
      shouldRemind: daysRemaining <= REMINDER_WINDOW_DAYS,
    };
  }

  // Quem cancelou nao recebe tolerancia nem cobranca de pagamento: o combinado
  // era acesso ate o fim do periodo pago, e o fim e o fim. Esticar dois dias e
  // depois bloquear seria pior do que encerrar na data prometida.
  if (cancelAtPeriodEnd) {
    return {
      phase: "ended",
      isTrial,
      cancelAtPeriodEnd,
      endsAt,
      daysRemaining: null,
      daysOverdue: null,
      hasAccess: false,
      shouldRemind: false,
    };
  }

  // Arredonda para baixo: so conta como um dia de atraso apos 24h completas.
  const daysOverdue = Math.floor(-diffMs / DAY_MS);
  const suspended = daysOverdue >= GRACE_PERIOD_DAYS;

  return {
    phase: suspended ? "suspended" : "grace",
    isTrial,
    cancelAtPeriodEnd,
    endsAt,
    daysRemaining: null,
    daysOverdue,
    hasAccess: !suspended,
    shouldRemind: true,
  };
}

/**
 * Plano em vigor para efeito de liberacao de funcionalidade.
 *
 * Este e o unico ponto por onde todas as paginas decidem o que liberar, entao a
 * suspensao por falta de pagamento e aplicada aqui: durante a tolerancia o
 * cliente continua com acesso, e depois dela o plano deixa de valer sem que
 * cada pagina precise saber disso.
 */
export function getActivePlanCode(company: ActivePlanCompany, now: Date = new Date()): SubscriptionPlan | null {
  const subscription = company.subscriptions?.[0];

  if (!subscription) {
    return null;
  }

  return getSubscriptionWindow(company, now).hasAccess ? subscription.plan.code : null;
}

export function assertActivePlanCode(plan: SubscriptionPlan | null | undefined): SubscriptionPlan {
  if (!plan) {
    throw new Error(NO_ACTIVE_SUBSCRIPTION_MESSAGE);
  }

  return plan;
}

export function assertCompanyHasActivePlan(company: ActivePlanCompany, now: Date = new Date()): SubscriptionPlan {
  const window = getSubscriptionWindow(company, now);

  if (window.phase === "ended") {
    throw new Error(SUBSCRIPTION_ENDED_MESSAGE);
  }

  if (window.phase === "suspended") {
    throw new Error(SUBSCRIPTION_SUSPENDED_MESSAGE);
  }

  return assertActivePlanCode(getActivePlanCode(company, now));
}

function pluralizeDays(days: number) {
  return days === 1 ? "1 dia" : `${days} dias`;
}

export type ReminderContent = {
  title: string;
  message: string;
};

/**
 * Texto do lembrete de pagamento. Retorna null quando nao ha nada a lembrar,
 * para que quem chama nao precise repetir a regra de quando avisar.
 */
export function buildReminderContent(window: SubscriptionWindow, planName: string): ReminderContent | null {
  if (!window.shouldRemind) {
    return null;
  }

  // O cancelamento vem antes das demais mensagens: quem ja pediu para sair nao
  // pode continuar recebendo lembrete para pagar.
  if (window.cancelAtPeriodEnd && window.daysRemaining !== null) {
    return {
      title: `Seu acesso termina em ${pluralizeDays(window.daysRemaining)}`,
      message: window.isTrial
        ? `O teste do Plano ${planName} foi cancelado e nenhuma cobranca sera feita. ` +
          "Para continuar usando, contrate um plano antes dessa data."
        : `A assinatura do Plano ${planName} foi cancelada e nao sera renovada. ` +
          "Ate la nada muda; depois disso as funcionalidades sao bloqueadas.",
    };
  }

  if (window.isTrial && window.daysRemaining !== null) {
    return {
      title: `Seu teste gratuito termina em ${pluralizeDays(window.daysRemaining)}`,
      message:
        `Depois disso a primeira cobranca do Plano ${planName} entra automaticamente e o acesso continua. ` +
        "Se preferir nao seguir, cancele antes do fim do teste.",
    };
  }

  if (window.phase === "expiring" && window.daysRemaining !== null) {
    return {
      title: `Plano ${planName} vence em ${pluralizeDays(window.daysRemaining)}`,
      message:
        `Realize o pagamento para manter o acesso. Apos o vencimento voce ainda tem ` +
        `${pluralizeDays(GRACE_PERIOD_DAYS)} de tolerancia antes das funcionalidades serem bloqueadas.`,
    };
  }

  if (window.phase === "grace" && window.daysOverdue !== null) {
    const diasRestantes = Math.max(0, GRACE_PERIOD_DAYS - window.daysOverdue);

    return {
      title: "Pagamento do plano em atraso",
      message:
        diasRestantes === 0
          ? "O acesso as funcionalidades sera bloqueado a qualquer momento. Regularize a assinatura agora."
          : `O acesso as funcionalidades sera bloqueado em ${pluralizeDays(diasRestantes)}. Regularize a assinatura.`,
    };
  }

  return {
    title: "Assinatura suspensa por falta de pagamento",
    message: `As funcionalidades do Plano ${planName} estao bloqueadas ate a regularizacao do pagamento.`,
  };
}
