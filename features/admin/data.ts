import "server-only";
import { prisma } from "@/lib/db/client";

/**
 * Numeros da plataforma inteira.
 *
 * Este e o unico lugar do sistema que consulta sem filtrar por empresa, e por
 * isso ele so pode ser chamado atras de requirePlatformAdmin. Nada aqui devolve
 * nome de empresa, de pessoa ou documento: sao contagens e somas, que e o que
 * responde as perguntas de negocio sem espalhar dado de cliente por mais uma
 * tela.
 */
const ASSINATURAS_VIGENTES = ["TRIALING", "ACTIVE", "PAST_DUE"] as const;

function inicioDeDiasAtras(dias: number) {
  const data = new Date();
  data.setDate(data.getDate() - dias);
  data.setHours(0, 0, 0, 0);

  return data;
}

export async function getPlatformOverview() {
  const trintaDias = inicioDeDiasAtras(30);
  const seteDias = inicioDeDiasAtras(7);

  const [porStatus, porPlano, planos, empresas, empresasNovas, usuariosAtivos, cancelamentosAgendados, pagasNoPeriodo, pagasTotal, emAberto] =
    await Promise.all([
      prisma.companySubscription.groupBy({ by: ["status"], _count: { _all: true } }),
      prisma.companySubscription.groupBy({
        by: ["planId", "status"],
        where: { status: { in: [...ASSINATURAS_VIGENTES] } },
        _count: { _all: true },
      }),
      prisma.planCatalog.findMany({ select: { id: true, code: true, name: true, priceCents: true } }),
      prisma.company.count({ where: { isDemo: false } }),
      prisma.company.count({ where: { isDemo: false, createdAt: { gte: trintaDias } } }),
      prisma.user.count({ where: { isActive: true, company: { isDemo: false } } }),
      prisma.companySubscription.count({
        where: { cancelAtPeriodEnd: true, status: { in: [...ASSINATURAS_VIGENTES] } },
      }),
      prisma.invoice.aggregate({
        where: { status: "PAID", paidAt: { gte: trintaDias } },
        _sum: { amountCents: true },
        _count: { _all: true },
      }),
      prisma.invoice.aggregate({ where: { status: "PAID" }, _sum: { amountCents: true }, _count: { _all: true } }),
      prisma.invoice.count({ where: { status: { in: ["OPEN", "OVERDUE"] } } }),
    ]);

  const porId = new Map(planos.map((plano) => [plano.id, plano]));
  const contaStatus = (status: string) => porStatus.find((linha) => linha.status === status)?._count._all ?? 0;

  const assinaturasPorPlano = planos
    .map((plano) => {
      const linhas = porPlano.filter((linha) => linha.planId === plano.id);
      const contar = (status: string) =>
        linhas.filter((linha) => linha.status === status).reduce((total, linha) => total + linha._count._all, 0);

      return {
        code: plano.code,
        name: plano.name,
        priceCents: plano.priceCents,
        ativas: contar("ACTIVE"),
        emTeste: contar("TRIALING"),
        inadimplentes: contar("PAST_DUE"),
      };
    })
    .sort((a, b) => a.priceCents - b.priceCents);

  // Receita recorrente conta apenas assinatura pagante. Teste ainda nao gerou
  // cobranca, e inadimplente e receita que existe no contrato mas nao entrou:
  // somar as duas na mesma linha esconderia exatamente o que precisa de acao.
  const receitaRecorrenteCents = porPlano
    .filter((linha) => linha.status === "ACTIVE")
    .reduce((total, linha) => total + (porId.get(linha.planId)?.priceCents ?? 0) * linha._count._all, 0);

  const emTesteCents = porPlano
    .filter((linha) => linha.status === "TRIALING")
    .reduce((total, linha) => total + (porId.get(linha.planId)?.priceCents ?? 0) * linha._count._all, 0);

  const novasAssinaturas = await prisma.companySubscription.count({ where: { createdAt: { gte: seteDias } } });

  return {
    assinantes: {
      ativas: contaStatus("ACTIVE"),
      emTeste: contaStatus("TRIALING"),
      inadimplentes: contaStatus("PAST_DUE"),
      canceladas: contaStatus("CANCELED"),
      expiradas: contaStatus("EXPIRED"),
      cancelamentosAgendados,
      novasEmSeteDias: novasAssinaturas,
    },
    porPlano: assinaturasPorPlano,
    receita: {
      recorrenteCents: receitaRecorrenteCents,
      emTesteCents,
      recebidoTrintaDiasCents: pagasNoPeriodo._sum.amountCents ?? 0,
      faturasPagasTrintaDias: pagasNoPeriodo._count._all,
      recebidoTotalCents: pagasTotal._sum.amountCents ?? 0,
      faturasPagasTotal: pagasTotal._count._all,
      faturasEmAberto: emAberto,
    },
    contas: {
      empresas,
      empresasNovasTrintaDias: empresasNovas,
      usuariosAtivos,
    },
  };
}

export type PlatformOverview = Awaited<ReturnType<typeof getPlatformOverview>>;
