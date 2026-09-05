import type { SubscriptionPlan } from "@prisma/client";
import { formatPriceCents, planAccess, planDetails, planOrder } from "@/lib/plans";
import { TRIAL_DAYS } from "@/lib/subscription";

// Marketing copy stays separate from pricing and access rules.
export const landingPlanCopy: Record<SubscriptionPlan, { name: string; description: string; features: string[] }> = {
  BASIC: { name: "Básico", description: "O essencial para organizar tarefas e responsabilidades.", features: ["Tarefas com responsável, prazo e prioridade", "Setores personalizáveis", "Comentários e notificações internas", "Painel simples de tarefas", "Metas simples"] },
  MANAGEMENT: { name: "Gestão", description: "Mais visibilidade para coordenar a equipe e a rotina.", features: ["Tudo do Básico", "Tarefas recorrentes e filtros avançados", "Desempenho por pessoa e setor", "Metas por setor ou responsável", "Relatórios básicos e histórico de atividades"] },
  COMPLETE: { name: "Completo", description: "Visão executiva para acompanhar uma operação maior.", features: ["Tudo do Gestão", "Relatórios completos", "Indicador de saúde operacional", "Leitura de gargalos e metas em risco", "Suporte premium"] },
};

type ComparisonRow = Record<SubscriptionPlan | "feature", string>;
function comparisonRow(feature: string, value: (code: SubscriptionPlan) => string): ComparisonRow {
  return { feature, BASIC: value("BASIC"), MANAGEMENT: value("MANAGEMENT"), COMPLETE: value("COMPLETE") };
}

export const landingComparison: ComparisonRow[] = [
  comparisonRow("Mensalidade base", (code) => `${formatPriceCents(planDetails[code].priceCents)}/mês`),
  comparisonRow("Usuários incluídos", (code) => String(planDetails[code].includedUsers)),
  comparisonRow("Usuário adicional", (code) => `${formatPriceCents(planDetails[code].pricePerExtraUserCents)}/mês`),
  comparisonRow("Limite de usuários ativos", (code) => String(planDetails[code].maxUsers ?? "Sem teto")),
  comparisonRow("Tarefas, setores, comentários e notificações", () => "Incluídos"),
  comparisonRow("Painel", (code) => code === "BASIC" ? "Resumo de tarefas" : code === "MANAGEMENT" ? "Painel do gestor" : "Painel executivo"),
  comparisonRow("Filtros de tarefas", (code) => planAccess[code].canUseAdvancedFilters ? "Status, setor, responsável e prioridade" : "Busca e status"),
  comparisonRow("Tarefas recorrentes", (code) => planAccess[code].canUseRecurringTasks ? "Incluídas" : "Não incluídas"),
  comparisonRow("Desempenho por pessoa e setor", (code) => planAccess[code].canViewPerformance ? "Incluído" : "Não incluído"),
  comparisonRow("Metas", (code) => planAccess[code].canUseGoalAssignments ? "Por setor ou responsável" : "Simples"),
  comparisonRow("Histórico de atividades", (code) => planAccess[code].canViewActivityHistory ? "Incluído" : "Não incluído"),
  comparisonRow("Relatórios", (code) => planAccess[code].canUseAdvancedReports ? "Completos, com leitura executiva" : planAccess[code].canUseBasicReports ? "Básicos" : "Não incluídos"),
  comparisonRow("Saúde operacional e metas em risco", (code) => planAccess[code].canUseAdvancedReports ? "Incluídas" : "Não incluídas"),
  comparisonRow("Suporte", (code) => planAccess[code].canUsePremiumSupport ? "Premium" : code === "MANAGEMENT" ? "Prioritário" : "E-mail ou chat interno"),
];

export const landingFaqs = [
  { question: `Como funciona o teste de ${TRIAL_DAYS} dias?`, answer: `Escolha um plano e conclua a contratação para iniciar o teste de ${TRIAL_DAYS} dias com os recursos desse plano. A primeira cobrança fica para o fim do teste. Para não ser cobrado, cancele antes dessa data nas configurações da assinatura.` },
  { question: "Criar uma conta já libera o sistema?", answer: "Não. O cadastro sem contratação fica sem plano ativo. Você pode escolher um plano nas configurações da conta e iniciar a contratação por lá." },
  { question: "Preciso cadastrar um cartão para o teste?", answer: "Sim. Na contratação do teste, o cartão é cadastrado para validação, sem cobrança no primeiro dia. A assinatura passa a ser cobrada após o período gratuito, caso não seja cancelada antes." },
  { question: "Como são cobrados os usuários adicionais?", answer: `A mensalidade inclui ${planOrder.map((code) => `${planDetails[code].includedUsers} usuários no ${landingPlanCopy[code].name}`).join(", ")}. Acima dessa quantidade, cada usuário ativo adicional tem o custo mensal informado no plano. O valor é apresentado para sua confirmação antes de adicionar a pessoa.` },
  { question: "E se minha equipe atingir o limite do plano?", answer: `O Básico permite até ${planDetails.BASIC.maxUsers} usuários ativos e o Gestão, até ${planDetails.MANAGEMENT.maxUsers}. Para adicionar além desses limites, é necessário mudar de plano. O Completo não tem teto rígido, mas mantém a cobrança por usuário adicional.` },
  { question: "Posso mudar de plano depois?", answer: "Sim. A contratação e a troca de plano ficam nas configurações da empresa. Para escolher um plano menor, ele precisa comportar a quantidade de usuários ativos da sua conta." },
  { question: "Como funciona o cancelamento?", answer: "O dono da empresa pode cancelar nas configurações da assinatura. O acesso continua até o fim do período contratado ou do teste, sem renovação. Depois, os recursos ficam bloqueados e os dados permanecem guardados." },
];
