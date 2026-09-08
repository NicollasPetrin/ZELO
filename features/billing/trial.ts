import "server-only";
import type { SubscriptionPlan } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { TRIAL_DAYS } from "@/lib/subscription";

export function trialPeriod(now: Date = new Date()) {
  const end = new Date(now);
  end.setDate(end.getDate() + TRIAL_DAYS);

  return { start: now, end };
}

/**
 * Se a empresa ainda tem direito ao teste gratuito.
 *
 * A regra e "uma vez por empresa, nunca mais", e ela e derivada de ja ter
 * existido alguma assinatura em vez de guardada numa coluna. Uma coluna
 * precisaria ser marcada certo em todo caminho que cria assinatura, e um
 * caminho esquecido viraria teste infinito; o historico nao tem como
 * dessincronizar de si mesmo.
 *
 * Vale tambem para quem comecou um teste e abandonou: a assinatura existiu,
 * entao o mes gratuito ja foi usado.
 */
export async function isTrialEligible(companyId: string) {
  const assinaturasAnteriores = await prisma.companySubscription.count({
    where: { companyId },
  });

  return assinaturasAnteriores === 0;
}

export type TrialStart =
  | { started: true; endsAt: Date }
  | { started: false; reason: "ja-usou" | "plano-ausente" };

/**
 * Libera o plano escolhido por TRIAL_DAYS dias, sem cobranca e sem cartao.
 *
 * Nao existe assinatura na processadora neste momento — nao ha o que cobrar, e
 * criar um cliente la para alguem que talvez nunca pague so sujaria a base. O
 * vinculo com o Asaas nasce depois, no primeiro pagamento de verdade.
 */
export async function startTrial(companyId: string, planCode: SubscriptionPlan): Promise<TrialStart> {
  const { start, end } = trialPeriod();

  return prisma.$transaction(async (tx) => {
    // Reconferido dentro da transacao: entre a checagem da tela e este ponto a
    // empresa pode ter comecado um teste em outra aba.
    const anteriores = await tx.companySubscription.count({ where: { companyId } });

    if (anteriores > 0) {
      return { started: false, reason: "ja-usou" } as const;
    }

    const plan = await tx.planCatalog.findUnique({ where: { code: planCode }, select: { id: true } });

    if (!plan) {
      return { started: false, reason: "plano-ausente" } as const;
    }

    await tx.companySubscription.create({
      data: {
        companyId,
        planId: plan.id,
        status: "TRIALING",
        currentPeriodStart: start,
        currentPeriodEnd: end,
        trialEndsAt: end,
      },
    });

    await tx.company.update({
      where: { id: companyId },
      data: { plan: planCode, pendingPlanCode: null },
    });

    return { started: true, endsAt: end } as const;
  });
}
