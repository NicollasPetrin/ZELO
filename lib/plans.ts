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

export const planDetails: Record<SubscriptionPlan, PlanDetails> = {
  BASIC: {
    code: "BASIC",
    name: "Basico",
    label: "Entrada",
    priceCents: 5990,
    pricePerExtraUserCents: 1490,
    price: "R$59,90",
    pricePerExtraUser: "R$14,90",
    includedUsers: 5,
    maxUsers: 15,
    shortDescription: "Para comecar a tirar a equipe da bagunca.",
    description: "Para comecar a tirar a equipe da bagunca e organizar tarefas, prazos e responsabilidades.",
    highlight: false,
    features: [
      "Ate 5 usuarios incluidos",
      "Usuarios extras por R$14,90/mes cada",
      "Teto de 15 usuarios ativos",
      "Setores padrao editaveis",
      "Cadastro de tarefas",
      "Responsavel, prazo, prioridade e status",
      "Comentarios nas tarefas",
      "Painel simples de tarefas",
      "Notificacoes internas basicas",
      "Metas simples",
      "Suporte por e-mail ou chat interno",
      "Acesso pelo computador",
    ],
  },
  MANAGEMENT: {
    code: "MANAGEMENT",
    name: "Gestao",
    label: "Mais escolhido",
    priceCents: 24990,
    pricePerExtraUserCents: 1190,
    price: "R$249,90",
    pricePerExtraUser: "R$11,90",
    includedUsers: 20,
    maxUsers: 45,
    shortDescription: "Melhor equilibrio entre preco e valor.",
    description: "Para empresas que querem organizar equipe, tarefas, setores, metas e rotina sem complicacao.",
    highlight: true,
    features: [
      "Tudo do Plano Basico",
      "Ate 20 usuarios incluidos",
      "Usuarios extras por R$11,90/mes cada",
      "Teto de 45 usuarios ativos",
      "Tarefas recorrentes",
      "Filtros avancados por setor, responsavel, prioridade e prazo",
      "Painel completo do gestor",
      "Desempenho por funcionario",
      "Desempenho por setor",
      "Metas por setor ou responsavel",
      "Relatorios basicos de tarefas, setores e responsaveis",
      "Notificacoes internas avancadas",
      "Historico de atividades",
      "Onboarding progressivo dentro da plataforma",
      "Suporte prioritario",
    ],
  },
  COMPLETE: {
    code: "COMPLETE",
    name: "Completo",
    label: "Premium",
    priceCents: 59990,
    pricePerExtraUserCents: 990,
    price: "R$599,90",
    pricePerExtraUser: "R$9,90",
    includedUsers: 60,
    maxUsers: null,
    shortDescription: "Relatorios executivos e controles avancados.",
    description: "Para empresas que querem relatorios completos, automacoes e controles avancados de operacao.",
    highlight: false,
    features: [
      "Tudo do Plano Gestao",
      "Ate 60 usuarios incluidos",
      "Usuarios extras por R$9,90/mes cada",
      "Sem teto rigido de usuarios",
      "Relatorios completos com leitura executiva",
      "Indicadores avancados de risco operacional",
      "Automacoes e recorrencias completas",
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
    dashboardName: "Painel executivo de operacao",
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
    feature: "Usuarios incluidos",
    BASIC: "Ate 5 usuarios",
    MANAGEMENT: "Ate 20 usuarios",
    COMPLETE: "Ate 60 usuarios",
  },
  {
    feature: "Usuario extra",
    BASIC: "R$14,90 por usuario/mes",
    MANAGEMENT: "R$11,90 por usuario/mes",
    COMPLETE: "R$9,90 por usuario/mes",
  },
  {
    feature: "Teto de usuarios ativos",
    BASIC: "15 usuarios",
    MANAGEMENT: "45 usuarios",
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
    MANAGEMENT: "Setor, responsavel, prioridade e status",
    COMPLETE: "Filtros completos para operacao maior",
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
    COMPLETE: "Liberado com visao executiva",
  },
  {
    feature: "Metas por setor/responsavel",
    BASIC: "Metas simples",
    MANAGEMENT: "Metas por setor ou responsavel",
    COMPLETE: "Metas com leitura executiva",
  },
  {
    feature: "Relatorios",
    BASIC: "Nao incluido",
    MANAGEMENT: "Relatorios basicos de tarefas, setores e responsaveis",
    COMPLETE: "Relatorios completos com leitura executiva",
  },
] satisfies Array<Record<SubscriptionPlan | "feature", string>>;

export function getPlanAccess(plan: SubscriptionPlan) {
  return planAccess[plan];
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
