"use server";

import { actionError } from "@/lib/action-result";
import { requireUser } from "@/lib/auth/session";
import { canViewTeamArea } from "@/lib/permissions";
import { getLiveStore, runSimulationTick, type AcaoSimulada, type Loja } from "@/features/simulation/engine";

/**
 * Uma batida do relogio da loja: a equipe ficticia age (se o expediente
 * estiver rodando) e a tela recebe a foto atualizada.
 *
 * So existe para quem gerencia equipe numa empresa de demonstracao; em
 * empresa de verdade ninguem pode fazer tarefa no lugar dos funcionarios.
 */
export async function liveStoreTickAction(rodar: boolean) {
  try {
    const user = await requireUser();

    if (!canViewTeamArea(user.role) || !user.company.isDemo) {
      throw new Error("A loja ao vivo existe só na empresa de teste.");
    }

    const acoes: AcaoSimulada[] = rodar === true ? await runSimulationTick(user.companyId) : [];
    const loja: Loja = await getLiveStore(user.companyId);

    return { ok: true, data: { loja, acoes } } as const;
  } catch (error) {
    return actionError(error, "Não foi possível atualizar a loja.");
  }
}
