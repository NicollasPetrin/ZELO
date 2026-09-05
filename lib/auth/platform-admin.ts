import "server-only";
import { notFound } from "next/navigation";
import { requireUser, type CurrentUser } from "@/lib/auth/session";
import { emailIsAllowed } from "@/lib/auth/admin-allowlist";
import { getPlatformAdminEmails } from "@/lib/env";

export function isPlatformAdmin(user: CurrentUser) {
  return emailIsAllowed(getPlatformAdminEmails(), user.email);
}

/**
 * Porta do painel da plataforma.
 *
 * Todo o resto do sistema e isolado por empresa: uma consulta sem companyId e
 * um vazamento. Esta area existe justamente para cruzar empresas, entao ela
 * precisa de uma porta que nao seja o papel OWNER — que e dono de uma empresa,
 * e existe em toda conta que se cadastra.
 *
 * Responde 404, e nao 403: quem nao e da casa nem descobre que a rota existe.
 */
export async function requirePlatformAdmin() {
  const user = await requireUser();

  if (!isPlatformAdmin(user)) {
    notFound();
  }

  return user;
}
