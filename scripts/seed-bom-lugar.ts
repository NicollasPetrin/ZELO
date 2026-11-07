/**
 * Empresa de teste: Mercadinho Bom Lugar (Tatuape, Sao Paulo).
 *
 * Cria uma empresa ficticia completa para testar a Zelo como um cliente real
 * usaria: 8 setores, 13 pessoas com login, 53 tarefas de 30 dias (rotinas
 * recorrentes e pedidos pontuais) e 24 metas do mes, no Plano Gestao.
 *
 * Uso (sempre contra um banco de TESTE, nunca o de producao):
 *   BOM_LUGAR_PASSWORD="..." npm run db:bom-lugar
 *   npm run db:bom-lugar -- --inicio 2026-11-16   muda o Dia 1 da simulacao
 *   npm run db:bom-lugar -- --recriar             apaga a empresa e cria de novo
 *
 * A Zelo decide "atrasada" pelo relogio de verdade. O Dia 1 padrao e
 * 2026-11-09 (uma segunda-feira); para comecar a simulacao hoje, passe
 * --inicio com a data de hoje.
 */
import { PrismaClient, type GoalUnit, type RecurrenceType, type TaskPriority, type UserRole } from "@prisma/client";
import { hashPassword } from "../lib/auth/password";
import { dueDateAt } from "../lib/due-date";
import { getPlanAccess, planDetails, planOrder } from "../lib/plans";

const prisma = new PrismaClient();

const COMPANY_NAME = "Mercadinho Bom Lugar";
const DEFAULT_START = "2026-11-09";

// Senha fora do repositorio, como nos outros scripts de demo: um valor fixo
// aqui viraria conta publica de quem clonasse o projeto.
const PASSWORD = process.env.BOM_LUGAR_PASSWORD?.trim();
const EMAIL_DOMAIN = (process.env.BOM_LUGAR_EMAIL_DOMAIN?.trim() || "bomlugar.test").toLowerCase();

type Args = { start: string; recreate: boolean };

function parseArgs(argv: string[]): Args {
  const args: Args = { start: DEFAULT_START, recreate: false };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];

    if (arg === "--recriar") {
      args.recreate = true;
    } else if (arg === "--inicio") {
      args.start = argv[i + 1] ?? "";
      i += 1;
    } else if (arg.startsWith("--inicio=")) {
      args.start = arg.slice("--inicio=".length);
    } else {
      throw new Error(`Opcao desconhecida: ${arg}. Use --inicio AAAA-MM-DD e/ou --recriar.`);
    }
  }

  if (!dueDateAt(args.start)) {
    throw new Error(`Data de inicio invalida: "${args.start}". Use o formato AAAA-MM-DD.`);
  }

  return args;
}

/** Dia (AAAA-MM-DD) que fica `offset` dias depois de `start`. */
function addDays(start: string, offset: number) {
  const [y, m, d] = start.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + offset));
  return date.toISOString().slice(0, 10);
}

function at(start: string, offset: number, time = "17:00") {
  const date = dueDateAt(addDays(start, offset), time);

  if (!date) {
    throw new Error(`Prazo invalido: dia ${offset} as ${time}.`);
  }

  return date;
}

// ---------------------------------------------------------------- setores

const DEPARTMENTS = [
  { name: "Caixa", description: "Abertura, fechamento, sangria e balcao de cigarro e recarga." },
  { name: "Açougue", description: "Vitrine, encomendas de carne e higiene sanitaria." },
  { name: "Hortifrúti", description: "Bancas, descarte, pedido de frutas, legumes e verduras e Quarta Verde." },
  { name: "Estoque", description: "Recebimento, reposicao, validade, temperatura e inventario." },
  { name: "Compras", description: "Pedidos, cotacoes e negociacao com fornecedores." },
  { name: "Financeiro", description: "Boletos, maquininhas, fiado, contador e folha." },
  { name: "Entregas", description: "Pedidos do WhatsApp, separacao e moto de entrega." },
  { name: "Loja", description: "Gerencia, escala, cartazes, manutencao e limpeza." },
] as const;

type DepartmentName = (typeof DEPARTMENTS)[number]["name"];

// ---------------------------------------------------------------- equipe

type PersonKey =
  | "valdir" | "marcia" | "thiago" | "neusa" | "jurandir" | "wesley" | "katia"
  | "bianca" | "rogerio" | "edinaldo" | "luana" | "matheus" | "cida";

const PEOPLE: Array<{ key: PersonKey; name: string; role: UserRole; position: string; department: DepartmentName }> = [
  { key: "valdir", name: "Valdir Ribeiro", role: "OWNER", position: "Dono", department: "Loja" },
  { key: "marcia", name: "Márcia Duarte", role: "MANAGER", position: "Gerente de loja", department: "Loja" },
  { key: "thiago", name: "Thiago Ribeiro", role: "MANAGER", position: "Comprador", department: "Compras" },
  { key: "neusa", name: "Neusa Ribeiro", role: "EMPLOYEE", position: "Financeiro", department: "Financeiro" },
  { key: "jurandir", name: "Jurandir Lopes", role: "EMPLOYEE", position: "Açougueiro-chefe", department: "Açougue" },
  { key: "wesley", name: "Wesley Santos", role: "EMPLOYEE", position: "Ajudante de açougue", department: "Açougue" },
  { key: "katia", name: "Kátia Rocha", role: "EMPLOYEE", position: "Caixa líder", department: "Caixa" },
  { key: "bianca", name: "Bianca Lima", role: "EMPLOYEE", position: "Operadora de caixa", department: "Caixa" },
  { key: "rogerio", name: "Rogério Alves", role: "EMPLOYEE", position: "Repositor", department: "Estoque" },
  { key: "edinaldo", name: "Edinaldo Pereira", role: "EMPLOYEE", position: "Recebimento", department: "Estoque" },
  { key: "luana", name: "Luana Ferreira", role: "EMPLOYEE", position: "Hortifrúti", department: "Hortifrúti" },
  { key: "matheus", name: "Matheus Oliveira", role: "EMPLOYEE", position: "Entregador e pedidos", department: "Entregas" },
  { key: "cida", name: "Aparecida Souza", role: "EMPLOYEE", position: "Limpeza e apoio", department: "Loja" },
];

const emailOf = (key: PersonKey) => `${key}@${EMAIL_DOMAIN}`;

// ---------------------------------------------------------------- tarefas

type Rec = "nenhuma" | "diaria" | "semanal" | "mensal";
type Prio = "baixa" | "media" | "alta";

/** [titulo, descricao, setor, responsavel, dia (0 = Dia 1), recorrencia, prioridade, hora] */
type TaskRow = [string, string, DepartmentName, PersonKey, number, Rec, Prio, string?];

const TASKS: TaskRow[] = [
  ["Abrir caixas e conferir troco", "Conferir R$ 200 de troco por caixa, ligar maquininhas e impressora fiscal até 7h.", "Caixa", "katia", 0, "diaria", "alta", "07:00"],
  ["Fechar caixas e entregar relatório", "Contar gaveta, fazer sangria, tirar relatório das maquininhas e entregar envelope à Neusa.", "Caixa", "bianca", 0, "diaria", "alta", "21:15"],
  ["Registrar temperatura dos refrigeradores", "Anotar na planilha da parede a temperatura dos 6 equipamentos, manhã e tarde (exigência da Vigilância).", "Estoque", "edinaldo", 0, "diaria", "alta"],
  ["Montar vitrine do açougue", "Moer carne do dia, porcionar bifes e repor vitrine até 8h.", "Açougue", "jurandir", 0, "diaria", "media", "08:00"],
  ["Higienizar serra, moedor e bancadas", "Limpeza completa no fechamento (exigência sanitária).", "Açougue", "wesley", 0, "diaria", "alta", "21:00"],
  ["Revisar bancas do hortifrúti", "Tirar o que estragou, anotar o peso descartado e refazer as bancas até 8h.", "Hortifrúti", "luana", 0, "diaria", "media", "08:00"],
  ["Repor gôndolas da manhã", "Mercearia, bebidas e laticínios repostos antes das 9h.", "Estoque", "rogerio", 0, "diaria", "media", "09:00"],
  ["Atender pedidos do WhatsApp", "Responder clientes, separar sacolas e programar as entregas do dia.", "Entregas", "matheus", 0, "diaria", "alta"],
  ["Limpeza do salão e banheiro", "Varrer, passar pano nos corredores, limpar banheiro de clientes e copa.", "Loja", "cida", 0, "diaria", "media"],
  ["Conferir validade de laticínios e frios", "Puxar para a frente o que vence em 7 dias e separar o vencido para troca.", "Estoque", "rogerio", 0, "semanal", "alta"],
  ["Corrigir etiqueta do café", "Gôndola R$ 18,90 x caixa R$ 21,49. Conferir todo o corredor 1.", "Estoque", "rogerio", 0, "nenhuma", "alta"],
  ["Reunião de 15 min: apresentar a Zelo", "Mostrar como ver e concluir tarefas; ajudar quem não conseguiu entrar.", "Loja", "thiago", 0, "nenhuma", "alta", "08:30"],
  ["Fazer pedido semanal ao atacadista", "Mercearia, limpeza e higiene. Enviar até terça 12h.", "Compras", "thiago", 1, "semanal", "alta", "12:00"],
  ["Fazer pedido de FLV", "Pedido de frutas, legumes e verduras para a Quarta Verde.", "Hortifrúti", "luana", 1, "semanal", "alta"],
  ["Chamar técnico do freezer de sorvete", "Freezer do corredor 5 pingando há uma semana. Pedir orçamento antes.", "Loja", "marcia", 1, "nenhuma", "alta"],
  ["Trocar lâmpada do corredor 3", "Lâmpada tubular queimada sobre a seção de limpeza. Escada no estoque.", "Loja", "rogerio", 1, "nenhuma", "baixa"],
  ["Cobrar caderno de fiado", "Contatar quem tem conta aberta há mais de 30 dias.", "Financeiro", "neusa", 1, "mensal", "media"],
  ["Entregar compra mensal da Dona Lurdes", "Cliente de 82 anos, Rua Tuiuti. Lista fixa com a Márcia; cobrar na entrega.", "Entregas", "matheus", 1, "mensal", "media"],
  ["Conferir repasses das maquininhas", "Bater vendas no cartão com o valor que caiu na conta no mês anterior.", "Financeiro", "neusa", 1, "mensal", "alta"],
  ["Montar a Quarta Verde", "Ofertas de hortifrúti montadas e preços na balança até 8h.", "Hortifrúti", "luana", 2, "semanal", "media", "08:00"],
  ["Treinar Bianca: bobina e cancelamento", "Ensinar troca de bobina e cancelamento de item e de cupom sem chamar a gerente.", "Caixa", "katia", 2, "nenhuma", "media"],
  ["Devolver lote de iogurte vencido", "18 bandejas para troca com o representante do laticínio.", "Compras", "thiago", 2, "nenhuma", "media"],
  ["Contestar cobrança em dobro do frango", "Nota de outubro cobrada duas vezes (R$ 1.640). Pedir estorno.", "Financeiro", "neusa", 2, "nenhuma", "alta"],
  ["Separar vasilhames para a distribuidora", "Engradados e garrafas retornáveis contados para a coleta.", "Estoque", "edinaldo", 2, "semanal", "baixa"],
  ["Limpeza pesada do depósito", "Varrer atrás das prateleiras, conferir armadilhas, tirar papelão.", "Loja", "cida", 3, "semanal", "media"],
  ["Cobrar fiado da Dona Zélia", "R$ 340 em aberto desde setembro. Conversar pessoalmente.", "Financeiro", "valdir", 3, "nenhuma", "media"],
  ["Cotar panetones e chocotones", "Preço com 3 fornecedores; o pedido precisa sair em até uma semana.", "Compras", "thiago", 4, "nenhuma", "alta"],
  ["Pagar boletos da semana", "Pagar o que vence até segunda e arquivar comprovantes.", "Financeiro", "neusa", 4, "semanal", "alta"],
  ["Trocar cartazes de oferta do fim de semana", "Fazer os cartazes novos e tirar os vencidos da vitrine e das gôndolas.", "Loja", "marcia", 4, "semanal", "media"],
  ["Encomenda de churrasco do Sr. Paulo", "12 kg de picanha e 8 kg de linguiça para o condomínio. Retirada sábado 10h, 50% pago.", "Açougue", "jurandir", 5, "nenhuma", "alta", "10:00"],
  ["Limpar câmara fria", "Esvaziar prateleiras, lavar, conferir borracha da porta.", "Açougue", "wesley", 5, "semanal", "alta"],
  ["Contar cigarros e cartões de recarga", "Conferir estoque do balcão com a planilha.", "Caixa", "katia", 5, "semanal", "media"],
  ["Montar escala da semana seguinte", "Folgas, almoço e quem fecha. Colar no quadro e avisar.", "Loja", "marcia", 5, "semanal", "media"],
  ["Pagar conta de energia", "Venceu no domingo. Pagar na segunda sem falta.", "Financeiro", "neusa", 7, "mensal", "alta"],
  ["Revisão da moto de entrega", "Troca de óleo e pastilha de freio no horário de almoço.", "Entregas", "matheus", 7, "nenhuma", "media"],
  ["Consertar roda da paleteira", "Roda travando. Ver peça ou levar para conserto.", "Estoque", "edinaldo", 7, "nenhuma", "baixa"],
  ["Pedido extra para o feriado", "Cerveja, refrigerante, carvão e gelo para o feriado prolongado.", "Compras", "thiago", 8, "nenhuma", "alta"],
  ["Avisar horário do feriado", "Cartaz na porta, status do WhatsApp e escala. Feriado: 7h às 13h.", "Loja", "marcia", 9, "nenhuma", "media"],
  ["Renegociar prazo com distribuidora de bebidas", "Pedir boleto de 28 dias em vez de 14.", "Compras", "valdir", 9, "nenhuma", "media"],
  ["Orçamento de 15 cestas de Natal", "Escritório de contabilidade da rua pediu orçamento. Responder até quinta.", "Compras", "thiago", 10, "nenhuma", "alta"],
  ["Fechar ofertas da Black Friday", "20 produtos com margem conferida; validar com Seu Valdir.", "Loja", "marcia", 11, "nenhuma", "alta"],
  ["Confirmar dedetização do mês", "Confirmar visita e guardar o certificado na pasta da Vigilância.", "Loja", "marcia", 11, "mensal", "media"],
  ["Limpar caixa de gordura", "Caixas de gordura do açougue e da copa.", "Loja", "cida", 12, "mensal", "media"],
  ["Recarregar extintores vencidos", "3 extintores com selo vencido no mês passado. Agendar recarga.", "Loja", "marcia", 15, "nenhuma", "alta"],
  ["Colar cartazes da Black Friday", "Vitrine, porta e pontas de gôndola.", "Loja", "bianca", 17, "nenhuma", "media"],
  ["Pagar 1ª parcela do 13º", "Calcular com a contabilidade e pagar até o fim do mês.", "Financeiro", "neusa", 18, "nenhuma", "alta"],
  ["Organizar depósito para dezembro", "Liberar 2 prateleiras para panetones e bebidas de fim de ano.", "Estoque", "rogerio", 19, "nenhuma", "media"],
  ["Inventário do mês", "Contar mercearia, bebidas e higiene após o fechamento de domingo; passar os números ao Thiago.", "Estoque", "edinaldo", 20, "mensal", "alta", "14:00"],
  ["Escala de dezembro e folgas de fim de ano", "Definir quem trabalha em 24 e 31/12 e as folgas compensadas.", "Loja", "marcia", 21, "nenhuma", "alta"],
  ["Comprar aventais e toucas do açougue", "4 aventais e 1 caixa de toucas.", "Compras", "thiago", 23, "nenhuma", "baixa"],
  ["Enviar documentos ao contador", "Notas, extratos e folha de ponto até o dia 5.", "Financeiro", "neusa", 25, "mensal", "alta"],
  ["Entregar cestas de Natal do escritório", "Se o orçamento for aprovado: 15 cestas na Rua Itapura.", "Entregas", "matheus", 25, "nenhuma", "alta"],
  ["Abrir lista de encomendas de Natal", "Tender, chester, pernil e peru: nome, telefone e data de retirada.", "Açougue", "jurandir", 28, "nenhuma", "alta"],
];

const RECURRENCE: Record<Rec, RecurrenceType> = { nenhuma: "NONE", diaria: "DAILY", semanal: "WEEKLY", mensal: "MONTHLY" };
const PRIORITY: Record<Prio, TaskPriority> = { baixa: "LOW", media: "MEDIUM", alta: "HIGH" };

/** Quem cadastrou a tarefa: o dono passa tarefa para a gerencia, a gerente para o resto da equipe. */
function creatorOf(assignee: PersonKey): PersonKey {
  if (assignee === "valdir") return "thiago";
  if (assignee === "marcia" || assignee === "thiago" || assignee === "neusa") return "valdir";
  return "marcia";
}

// ---------------------------------------------------------------- metas

/** [titulo, descricao, setor, responsavel, alvo, unidade, dia final (29 = fim do periodo)] */
type GoalRow = [string, string, DepartmentName, PersonKey, number, GoalUnit, number];

const GOALS: GoalRow[] = [
  ["Dias sem diferença de caixa acima de R$ 20", "Conta um dia quando nenhum caixa fecha com diferença maior que R$ 20.", "Caixa", "katia", 30, "NUMBER", 29],
  ["Caixa fechado até 21h15", "Percentual dos dias com relatório entregue à Neusa até 21h15.", "Caixa", "bianca", 100, "PERCENT", 29],
  ["Bianca resolve bobina e cancelamento sozinha", "Sem chamar a gerente até o fim do treinamento.", "Caixa", "bianca", 100, "PERCENT", 11],
  ["Aproveitamento da carne comprada", "Perda de no máximo 3% do que entra no açougue.", "Açougue", "jurandir", 97, "PERCENT", 29],
  ["Encomendas prontas no horário combinado", "Percentual das encomendas de carne prontas na hora da retirada.", "Açougue", "jurandir", 100, "PERCENT", 29],
  ["Dias com higienização registrada", "Serra, moedor e bancadas limpos e marcados no fechamento.", "Açougue", "wesley", 30, "NUMBER", 29],
  ["Economia no descarte de frutas, legumes e verduras", "Reduzir o descarte de R$ 1.800 para R$ 1.200 no mês.", "Hortifrúti", "luana", 600, "BRL", 29],
  ["Quarta Verde pronta até 8h", "Quartas-feiras com ofertas montadas e preços na balança no horário.", "Hortifrúti", "luana", 4, "NUMBER", 29],
  ["Semanas sem reclamação de fruta passada", "Nenhum cliente reclamando de fruta estragada na banca.", "Hortifrúti", "luana", 4, "NUMBER", 29],
  ["Conferências de validade sem vencido na gôndola", "Semanas em que o Seu Valdir não acha produto vencido exposto.", "Estoque", "rogerio", 4, "NUMBER", 29],
  ["Dias sem divergência de preço reclamada", "Nenhum cliente reclamando de preço da gôndola diferente do caixa.", "Estoque", "rogerio", 30, "NUMBER", 29],
  ["Entregas conferidas antes de assinar a nota", "Percentual das entregas de fornecedor contadas antes da assinatura.", "Estoque", "edinaldo", 100, "PERCENT", 29],
  ["Itens mais vendidos sem falta na gôndola", "Dos 30 itens mais vendidos, quantos não faltaram nenhum dia.", "Compras", "thiago", 30, "NUMBER", 29],
  ["Pedidos semanais enviados até terça 12h", "Pedido ao atacadista enviado no horário em todas as semanas.", "Compras", "thiago", 4, "NUMBER", 29],
  ["Fornecedores de Natal fechados", "Panetones, bebidas e cestas com fornecedor e preço fechados.", "Compras", "thiago", 3, "NUMBER", 11],
  ["Boletos pagos sem juros", "Percentual dos boletos pagos até o vencimento.", "Financeiro", "neusa", 100, "PERCENT", 29],
  ["Fiado recebido", "Baixar o fiado em aberto de R$ 4.200 para R$ 2.500.", "Financeiro", "neusa", 1700, "BRL", 29],
  ["Documentos ao contador até o dia 5", "Notas, extratos e folha entregues no prazo.", "Financeiro", "neusa", 100, "PERCENT", 29],
  ["Pedidos respondidos em até 30 minutos", "Percentual dos pedidos do WhatsApp respondidos em até 30 min no horário comercial.", "Entregas", "matheus", 100, "PERCENT", 29],
  ["Entregas feitas em até 2 horas", "Percentual das entregas que chegam em até 2h depois do pedido.", "Entregas", "matheus", 90, "PERCENT", 29],
  ["Semanas sem item esquecido ou trocado", "Nenhuma reclamação de cliente por item faltando na sacola.", "Entregas", "matheus", 4, "NUMBER", 29],
  ["Sextas com cartazes de oferta atualizados", "Cartazes novos e os vencidos retirados toda sexta.", "Loja", "marcia", 4, "NUMBER", 29],
  ["Manutenções resolvidas em até 3 dias", "Percentual dos consertos chamados e resolvidos em até 3 dias.", "Loja", "marcia", 100, "PERCENT", 29],
  ["Dias com limpeza concluída", "Salão, banheiro e copa limpos e marcados no dia.", "Loja", "cida", 30, "NUMBER", 29],
];

// ---------------------------------------------------------------- execucao

function featureKey(feature: string) {
  return feature
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/** Garante o Plano Gestao no catalogo, com os mesmos dados do script de demos. */
async function ensureManagementPlan() {
  const plan = "MANAGEMENT" as const;
  const details = planDetails[plan];
  const access = getPlanAccess(plan);
  const data = {
    name: details.name,
    label: details.label,
    description: details.description,
    priceCents: details.priceCents,
    pricePerExtraUser: details.pricePerExtraUserCents,
    includedUsers: details.includedUsers,
    maxUsers: access.maxUsers,
    dashboardName: access.dashboardName,
    isHighlighted: details.highlight,
    isActive: true,
    sortOrder: planOrder.indexOf(plan) + 1,
  };
  const record = await prisma.planCatalog.upsert({ where: { code: plan }, update: {}, create: { code: plan, ...data } });

  for (const [index, feature] of details.features.entries()) {
    await prisma.planFeature.upsert({
      where: { planId_featureKey: { planId: record.id, featureKey: featureKey(feature) } },
      update: {},
      create: { planId: record.id, featureKey: featureKey(feature), name: feature, included: true, sortOrder: index + 1 },
    });
  }

  return record;
}

function databaseHost() {
  try {
    return new URL(process.env.DATABASE_URL ?? "").host || "(desconhecido)";
  } catch {
    return "(desconhecido)";
  }
}

async function main() {
  if (!PASSWORD || PASSWORD.length < 8) {
    throw new Error(
      "BOM_LUGAR_PASSWORD nao definida (minimo 8 caracteres). Ela vira a senha de todos os logins do Mercadinho Bom Lugar.",
    );
  }

  const args = parseArgs(process.argv.slice(2));
  console.log(`Banco: ${databaseHost()}`);
  console.log(`Dia 1 da simulacao: ${args.start}`);

  const ownerEmail = emailOf("valdir");
  const existing = await prisma.user.findUnique({ where: { email: ownerEmail }, select: { companyId: true } });

  if (existing && !args.recreate) {
    throw new Error(
      `O ${COMPANY_NAME} ja existe neste banco (login ${ownerEmail}). Rode com --recriar para apagar e criar de novo.`,
    );
  }

  // Um e-mail da equipe preso a outra empresa quebraria o cadastro no meio.
  const emails = PEOPLE.map((person) => emailOf(person.key));
  const taken = await prisma.user.findMany({
    where: { email: { in: emails }, ...(existing ? { companyId: { not: existing.companyId } } : {}) },
    select: { email: true },
  });

  if (taken.length) {
    throw new Error(
      `Estes e-mails ja pertencem a outra empresa: ${taken.map((user) => user.email).join(", ")}. Use BOM_LUGAR_EMAIL_DOMAIN para outro dominio.`,
    );
  }

  const plan = await ensureManagementPlan();
  const now = new Date();
  const lastDay = at(args.start, 29, "23:59");
  // Assinatura valendo durante toda a simulacao, com folga, comecando hoje.
  const periodEnd = new Date(Math.max(now.getTime(), lastDay.getTime()) + 15 * 24 * 60 * 60 * 1000);

  const summary = await prisma.$transaction(
    async (tx) => {
      if (existing) {
        // Tarefas primeiro: elas seguram setor e pessoas (onDelete: Restrict).
        await tx.task.deleteMany({ where: { companyId: existing.companyId } });
        await tx.company.delete({ where: { id: existing.companyId } });
      }

      const company = await tx.company.create({
        data: {
          name: COMPANY_NAME,
          segment: "Mercado de bairro",
          phone: "(11) 2090-0000",
          email: `contato@${EMAIL_DOMAIN}`,
          address: "Rua Serra de Bragança",
          province: "Tatuapé",
          city: "São Paulo",
          state: "SP",
          employeeCount: PEOPLE.length,
          plan: "MANAGEMENT",
          isDemo: true,
          isActive: true,
        },
      });

      await tx.companySubscription.create({
        data: { companyId: company.id, planId: plan.id, status: "ACTIVE", currentPeriodStart: now, currentPeriodEnd: periodEnd },
      });

      const departments = new Map<DepartmentName, string>();
      for (const department of DEPARTMENTS) {
        const created = await tx.department.create({ data: { companyId: company.id, ...department } });
        departments.set(department.name, created.id);
      }

      const users = new Map<PersonKey, { id: string; name: string }>();
      for (const person of PEOPLE) {
        const created = await tx.user.create({
          data: {
            companyId: company.id,
            departmentId: departments.get(person.department),
            name: person.name,
            email: emailOf(person.key),
            passwordHash: hashPassword(PASSWORD),
            role: person.role,
            position: person.position,
          },
        });
        users.set(person.key, { id: created.id, name: created.name });
      }

      const owner = users.get("valdir")!;
      await tx.activityLog.create({
        data: { companyId: company.id, actorId: owner.id, type: "COMPANY_CREATED", entityType: "Company", entityId: company.id, title: "Empresa criada", description: COMPANY_NAME },
      });

      for (const [title, description, departmentName, assigneeKey, offset, rec, prio, time] of TASKS) {
        const assignee = users.get(assigneeKey)!;
        const creator = users.get(creatorOf(assigneeKey))!;
        const dueDate = at(args.start, offset, time);
        const task = await tx.task.create({
          data: {
            companyId: company.id,
            departmentId: departments.get(departmentName)!,
            assigneeId: assignee.id,
            creatorId: creator.id,
            title,
            description,
            dueDate,
            priority: PRIORITY[prio],
            // "Atrasada" vem do prazo; se o Dia 1 ja passou, a Zelo mostra sozinha.
            status: "PENDING",
          },
        });

        if (rec !== "nenhuma") {
          await tx.recurrenceRule.create({
            data: { taskId: task.id, type: RECURRENCE[rec], startDate: dueDate },
          });
        }

        // O mesmo aviso que a tela de nova tarefa manda para o responsavel.
        await tx.notification.create({
          data: {
            companyId: company.id,
            userId: assignee.id,
            type: "TASK_ASSIGNED",
            title: "Nova tarefa atribuída",
            message: `${creator.name} atribuiu a tarefa "${title}" para você.`,
            link: `/tasks/${task.id}`,
            relatedTaskId: task.id,
          },
        });

        await tx.activityLog.create({
          data: {
            companyId: company.id,
            actorId: creator.id,
            type: "TASK_CREATED",
            entityType: "Task",
            entityId: task.id,
            title: "Tarefa criada",
            description: title,
            metadata: JSON.stringify({ assigneeId: assignee.id, priority: PRIORITY[prio], status: "PENDING" }),
          },
        });
      }

      for (const [title, description, departmentName, responsibleKey, targetValue, unit, endOffset] of GOALS) {
        await tx.goal.create({
          data: {
            companyId: company.id,
            departmentId: departments.get(departmentName)!,
            responsibleId: users.get(responsibleKey)!.id,
            title,
            description,
            targetValue,
            currentValue: 0,
            unit,
            period: endOffset === 29 ? "MONTHLY" : "CUSTOM",
            status: "ON_TRACK",
            startDate: at(args.start, 0, "07:00"),
            endDate: at(args.start, endOffset, "23:59"),
          },
        });
      }

      return { companyId: company.id };
    },
    { timeout: 120_000, maxWait: 10_000 },
  );

  console.log(`\n${COMPANY_NAME} criado (empresa ${summary.companyId}).`);
  console.log(`${DEPARTMENTS.length} setores, ${PEOPLE.length} pessoas, ${TASKS.length} tarefas, ${GOALS.length} metas. Plano Gestão ativo até ${periodEnd.toISOString().slice(0, 10)}.\n`);
  console.log("Logins:");
  for (const person of PEOPLE) {
    console.log(`  ${person.name.padEnd(18)} ${person.position.padEnd(22)} ${emailOf(person.key)}`);
  }
  // A senha nao e impressa: a saida pode acabar num log.
  console.log("\nSenha de todos: a que esta em BOM_LUGAR_PASSWORD.");
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
