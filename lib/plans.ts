import type { SubscriptionPlan } from "@prisma/client";

export type PlanDetails = {
  code: SubscriptionPlan;
  name: string;
  label: string;
  priceCents: number;
  pricePerExtraUserCents: number;
  price: string;
  pricePerExtraUser: string;
  includedUsers: number;
  maxUsers: number | null;
  shortDescription: string;
  description: string;
  highlight: boolean;
  features: string[];
};

export type PlanAccess = {
  includedUsers: number;
  maxUsers: number | null;
  dashboardName: string;
  canUseAdvancedFilters: boolean;
  canViewPerformance: boolean;
  canUseRecurringTasks: boolean;
  canUseGoalAssignments: boolean;
  canViewActivityHistory: boolean;
  canUseBasicReports: boolean;
  canUseAdvancedReports: boolean;
  canUsePremiumSupport: boolean;
};

export type MonthlyPriceCalculation = {
  plan: SubscriptionPlan;
  activeUserCount: number;
  basePriceCents: number;
  includedUsers: number;
  maxUsers: number | null;
  extraUsers: number;
  pricePerExtraUserCents: number;
  extraUsersPriceCents: number;
  totalPriceCents: number | null;
  requiresUpgrade: boolean;
};

export const planOrder: SubscriptionPlan[] = ["BASIC", "MANAGEMENT", "COMPLETE"];

const noActivePlanAccess: PlanAccess = {
  includedUsers: 0,
  maxUsers: 0,
  dashboardName: "Assinatura pendente",
  canUseAdvancedFilters: false,
  canViewPerformance: false,
  canUseRecurringTasks: false,
  canUseGoalAssignments: false,
  canViewActivityHistory: false,
  canUseBasicReports: false,
  canUseAdvancedReports: false,
  canUsePremiumSupport: false,
};

export const planDetails: Record<SubscriptionPlan, PlanDetails> = {
  BASIC: {
    code: "BASIC",
    name: "Básico",
    label: "Entrada",
    priceCents: 5990,
    pricePerExtraUserCents: 1190,
    price: "R$59,90",
    pricePerExtraUser: "R$11,90",
    includedUsers: 5,
    maxUsers: 15,
    shortDescription: "Para começar a tirar a equipe da bagunça.",
    description: "Para começar a tirar a equipe da bagunça e organizar tarefas, prazos e responsabilidades.",
    highlight: false,
    features: [
      "Até 5 usuários incluídos",
      "Usuários extras por R$11,90/mês cada",
      "Teto de 15 usuários ativos",
      "Setores padrão editáveis",
      "Cadastro de tarefas",
      "Responsável, prazo, prioridade e status",
      "Comentários nas tarefas",
      "Painel simples de tarefas",
      "Notificações internas básicas",
      "Metas simples",
      "Suporte por e-mail ou chat interno",
      "Acesso pelo computador",
    ],
  },
  MANAGEMENT: {
    code: "MANAGEMENT",
    name: "Gestão",
    label: "Mais escolhido",
    priceCents: 19990,
    pricePerExtraUserCents: 990,
    price: "R$199,90",
    pricePerExtraUser: "R$9,90",
    includedUsers: 20,
    maxUsers: 45,
    shortDescription: "Melhor equilíbrio entre preço e valor.",
    description: "Para empresas que querem organizar equipe, tarefas, setores, metas e rotina sem complicação.",
    highlight: true,
    features: [
      "Tudo do Plano Básico",
      "Até 20 usuários incluídos",
      "Usuários extras por R$9,90/mês cada",
      "Teto de 45 usuários ativos",
      "Tarefas recorrentes",
      "Filtros avançados por setor, responsável, prioridade e prazo",
      "Painel completo do gestor",
      "Desempenho por funcionário",
      "Desempenho por setor",
      "Metas por setor ou responsável",
      "Relatórios básicos de tarefas, setores e responsáveis",
      "Notificações internas avançadas",
      "Histórico de atividades",
      "Onboarding progressivo dentro da plataforma",
      "Suporte prioritário",
    ],
  },
  COMPLETE: {
    code: "COMPLETE",
    name: "Completo",
    label: "Premium",
    priceCents: 49990,
    pricePerExtraUserCents: 790,
    price: "R$499,90",
    pricePerExtraUser: "R$7,90",
    includedUsers: 60,
    maxUsers: null,
    shortDescription: "Relatórios executivos e controles avançados.",
    description: "Para empresas que querem relatórios completos, automações e controles avançados de operação.",
    highlight: false,
    features: [
      "Tudo do Plano Gestão",
      "Até 60 usuários incluídos",
      "Usuários extras por R$7,90/mês cada",
      "Sem teto rígido de usuários",
      "Relatórios completos com leitura executiva",
      "Indicadores avançados de risco operacional",
      "Automações e recorrências completas",
      "Suporte premium",
      "Prioridade em novas funcionalidades",
    ],
  },
};

export const planAccess: Record<SubscriptionPlan, PlanAccess> = {
  BASIC: {
    includedUsers: 5,
    maxUsers: 15,
    dashboardName: "Painel simples de tarefas",
    canUseAdvancedFilters: false,
    canViewPerformance: false,
    canUseRecurringTasks: false,
    canUseGoalAssignments: false,
    canViewActivityHistory: false,
    canUseBasicReports: false,
    canUseAdvancedReports: false,
    canUsePremiumSupport: false,
  },
  MANAGEMENT: {
    includedUsers: 20,
    maxUsers: 45,
    dashboardName: "Painel completo do gestor",
    canUseAdvancedFilters: true,
    canViewPerformance: true,
    canUseRecurringTasks: true,
    canUseGoalAssignments: true,
    canViewActivityHistory: true,
    canUseBasicReports: true,
    canUseAdvancedReports: false,
    canUsePremiumSupport: false,
  },
  COMPLETE: {
    includedUsers: 60,
    maxUsers: null,
    dashboardName: "Painel executivo de operação",
    canUseAdvancedFilters: true,
    canViewPerformance: true,
    canUseRecurringTasks: true,
    canUseGoalAssignments: true,
    canViewActivityHistory: true,
    canUseBasicReports: true,
    canUseAdvancedReports: true,
    canUsePremiumSupport: true,
  },
};

export const planDifferences = [
  {
    feature: "Usuários incluídos",
    BASIC: "Até 5 usuários",
    MANAGEMENT: "Até 20 usuários",
    COMPLETE: "Até 60 usuários",
  },
  {
    feature: "Usuário extra",
    BASIC: "R$11,90 por usuário/mês",
    MANAGEMENT: "R$9,90 por usuário/mês",
    COMPLETE: "R$7,90 por usuário/mês",
  },
  {
    feature: "Teto de usuários ativos",
    BASIC: "15 usuários",
    MANAGEMENT: "45 usuários",
    COMPLETE: "Ilimitado",
  },
  {
    feature: "Painel",
    BASIC: "Painel simples de tarefas",
    MANAGEMENT: "Painel completo do gestor",
    COMPLETE: "Painel executivo com leitura premium",
  },
  {
    feature: "Filtros de tarefas",
    BASIC: "Busca e status",
    MANAGEMENT: "Setor, responsável, prioridade e status",
    COMPLETE: "Filtros completos para operação maior",
  },
  {
    feature: "Tarefas recorrentes",
    BASIC: "Bloqueado",
    MANAGEMENT: "Liberado",
    COMPLETE: "Liberado",
  },
  {
    feature: "Desempenho por pessoa/setor",
    BASIC: "Bloqueado",
    MANAGEMENT: "Liberado",
    COMPLETE: "Liberado com visão executiva",
  },
  {
    feature: "Metas por setor/responsável",
    BASIC: "Metas simples",
    MANAGEMENT: "Metas por setor ou responsável",
    COMPLETE: "Metas com leitura executiva",
  },
  {
    feature: "Relatórios",
    BASIC: "Não incluído",
    MANAGEMENT: "Relatórios básicos de tarefas, setores e responsáveis",
    COMPLETE: "Relatórios completos com leitura executiva",
  },
] satisfies Array<Record<SubscriptionPlan | "feature", string>>;

export function getPlanAccess(plan: SubscriptionPlan | null | undefined) {
  return plan ? planAccess[plan] : noActivePlanAccess;
}

export function canActivateAdditionalUser(plan: SubscriptionPlan, currentActiveUserCount: number) {
  if (!Number.isInteger(currentActiveUserCount) || currentActiveUserCount < 0) {
    throw new RangeError("currentActiveUserCount precisa ser um inteiro maior ou igual a zero.");
  }

  const maxUsers = planDetails[plan].maxUsers;

  return maxUsers === null || currentActiveUserCount < maxUsers;
}

export function formatPriceCents(amountCents: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(amountCents / 100);
}

export function calculateMonthlyPrice(plan: SubscriptionPlan, activeUserCount: number): MonthlyPriceCalculation {
  if (!Number.isInteger(activeUserCount) || activeUserCount < 0) {
    throw new RangeError("activeUserCount precisa ser um inteiro maior ou igual a zero.");
  }

  const details = planDetails[plan];
  const extraUsers = Math.max(0, activeUserCount - details.includedUsers);
  const extraUsersPriceCents = extraUsers * details.pricePerExtraUserCents;
  const requiresUpgrade = details.maxUsers !== null && activeUserCount > details.maxUsers;

  return {
    plan,
    activeUserCount,
    basePriceCents: details.priceCents,
    includedUsers: details.includedUsers,
    maxUsers: details.maxUsers,
    extraUsers,
    pricePerExtraUserCents: details.pricePerExtraUserCents,
    extraUsersPriceCents,
    totalPriceCents: requiresUpgrade ? null : details.priceCents + extraUsersPriceCents,
    requiresUpgrade,
  };
}
