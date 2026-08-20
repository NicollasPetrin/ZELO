import "server-only";
import { createCustomer, updateCustomer } from "@/lib/asaas/client";
import { prisma } from "@/lib/db/client";
import { parseDocument } from "@/lib/document";
import { parsePhone } from "@/lib/phone";

export const MISSING_DOCUMENT_MESSAGE =
  "Cadastre o CNPJ ou CPF da empresa em Configuracoes antes de assinar um plano. A processadora exige o documento para emitir a cobranca.";

export const MISSING_PHONE_MESSAGE =
  "Cadastre o telefone da empresa em Configuracoes antes de assinar um plano. A processadora exige o telefone para emitir a cobranca.";

export const MISSING_ADDRESS_MESSAGE =
  "Complete o endereco da empresa em Configuracoes antes de assinar um plano. A processadora exige CEP, logradouro, numero e bairro do pagador.";

export type CompanyForBilling = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  postalCode: string | null;
  address: string | null;
  addressNumber: string | null;
  addressComplement: string | null;
  province: string | null;
  asaasCustomerId: string | null;
};

/** Campos de endereco que o checkout do Asaas recusa em branco. */
function requiredAddress(company: CompanyForBilling) {
  const postalCode = company.postalCode?.replace(/\D/g, "") ?? "";
  const address = company.address?.trim() ?? "";
  const addressNumber = company.addressNumber?.trim() ?? "";
  const province = company.province?.trim() ?? "";

  if (postalCode.length !== 8 || !address || !addressNumber || !province) {
    return null;
  }

  return { postalCode, address, addressNumber, province };
}

/**
 * Garante que a empresa tenha um cliente correspondente no Asaas e devolve o id.
 *
 * Esse id e o unico vinculo confiavel entre um pagamento e a empresa: o
 * externalReference informado no checkout nao chega ao pagamento nem a
 * assinatura, entao identificar pelo cliente e o que faz o webhook saber de
 * quem e o dinheiro.
 */
export async function ensureAsaasCustomer(company: CompanyForBilling) {
  const document = parseDocument(company.document);

  if (!document) {
    throw new Error(MISSING_DOCUMENT_MESSAGE);
  }

  // O Asaas recusa usar no checkout um cliente sem telefone, e a mensagem que
  // ele devolve nesse caso nao diz onde resolver.
  const phone = parsePhone(company.phone);

  if (!phone) {
    throw new Error(MISSING_PHONE_MESSAGE);
  }

  // Sem endereco completo o Asaas recusa usar o cliente no checkout, com uma
  // mensagem que nao indica onde resolver.
  const address = requiredAddress(company);

  if (!address) {
    throw new Error(MISSING_ADDRESS_MESSAGE);
  }

  const dados = {
    name: company.name,
    cpfCnpj: document.digits,
    email: company.email ?? undefined,
    phone: phone.digits,
    mobilePhone: phone.isMobile ? phone.digits : undefined,
    postalCode: address.postalCode,
    address: address.address,
    addressNumber: address.addressNumber,
    complement: company.addressComplement?.trim() || undefined,
    province: address.province,
    // Do lado do Asaas tambem guardamos de quem e o cliente, o que ajuda a
    // reconciliar manualmente quando alguem olha o painel deles.
    externalReference: company.id,
  };

  if (company.asaasCustomerId) {
    // Um cliente criado antes destes campos serem obrigatorios continuaria sem
    // telefone e quebraria todo checkout. Sincronizar aqui conserta esses casos
    // sem exigir intervencao manual.
    await updateCustomer(company.asaasCustomerId, dados);

    return company.asaasCustomerId;
  }

  const customer = await createCustomer(dados);

  await prisma.company.update({
    where: { id: company.id },
    data: { asaasCustomerId: customer.id },
  });

  return customer.id;
}
