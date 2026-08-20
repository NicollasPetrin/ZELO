import "server-only";
import { createCustomer } from "@/lib/asaas/client";
import { prisma } from "@/lib/db/client";

export const MISSING_DOCUMENT_MESSAGE =
  "Cadastre o CNPJ da empresa em Configuracoes antes de assinar um plano. A processadora exige o documento para emitir a cobranca.";

/** Deixa apenas digitos: o Asaas recusa CNPJ com pontuacao. */
function onlyDigits(value: string) {
  return value.replace(/\D/g, "");
}

type CompanyForBilling = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  asaasCustomerId: string | null;
};

/**
 * Garante que a empresa tenha um cliente correspondente no Asaas e devolve o id.
 *
 * Esse id e o unico vinculo confiavel entre um pagamento e a empresa: o
 * externalReference informado no checkout nao chega ao pagamento nem a
 * assinatura, entao identificar pelo cliente e o que faz o webhook saber de
 * quem e o dinheiro.
 */
export async function ensureAsaasCustomer(company: CompanyForBilling) {
  if (company.asaasCustomerId) {
    return company.asaasCustomerId;
  }

  const document = company.document ? onlyDigits(company.document) : "";

  if (!document) {
    throw new Error(MISSING_DOCUMENT_MESSAGE);
  }

  const customer = await createCustomer({
    name: company.name,
    cpfCnpj: document,
    email: company.email ?? undefined,
    phone: company.phone ?? undefined,
    // Do lado do Asaas tambem guardamos de quem e o cliente, o que ajuda a
    // reconciliar manualmente quando alguem olha o painel deles.
    externalReference: company.id,
  });

  await prisma.company.update({
    where: { id: company.id },
    data: { asaasCustomerId: customer.id },
  });

  return customer.id;
}
