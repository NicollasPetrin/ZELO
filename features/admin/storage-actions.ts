"use server";

import { actionError } from "@/lib/action-result";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { isStorageConfigured, STORAGE_NOT_CONFIGURED_MESSAGE } from "@/lib/env";
import { testStorageRoundTrip } from "@/lib/storage/r2";

/**
 * Confere as credenciais do armazenamento gravando, lendo e apagando um arquivo
 * descartavel.
 *
 * A assinatura das requisicoes e testada por unidade, mas teste de unidade
 * prova que o algoritmo e estavel, nao que a chave, o bucket e a conta estao
 * certos. Isso so o proprio servico responde — e a resposta dele chega inteira
 * aqui, porque "erro ao enviar a foto" nao diz a ninguem o que corrigir.
 */
export async function testStorageAction() {
  try {
    await requirePlatformAdmin();

    if (!isStorageConfigured()) {
      throw new Error(STORAGE_NOT_CONFIGURED_MESSAGE);
    }

    const { objectKey } = await testStorageRoundTrip();

    return {
      ok: true,
      message: `Armazenamento respondendo: gravou, leu e apagou ${objectKey}.`,
    } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel falar com o armazenamento.");
  }
}
