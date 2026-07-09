"use server";

import { revalidatePath } from "next/cache";
import { actionError } from "@/lib/action-result";
import { assertCanManageCompany } from "@/lib/auth/guards";
import { requireUser } from "@/lib/auth/session";
import { prisma } from "@/lib/db/client";
import { companySettingsSchema } from "@/lib/validations";

export async function saveCompanySettingsAction(values: unknown) {
  try {
    const user = await requireUser();
    assertCanManageCompany(user);

    const parsed = companySettingsSchema.parse(values);

    await prisma.company.update({
      where: {
        id: user.companyId,
      },
      data: {
        name: parsed.name,
        segment: parsed.segment || null,
        employeeCount: parsed.employeeCount === "" ? null : parsed.employeeCount,
        isActive: parsed.isActive,
      },
    });

    revalidatePath("/settings");
    revalidatePath("/", "layout");
    return { ok: true, message: "Configuracoes salvas." } as const;
  } catch (error) {
    return actionError(error, "Nao foi possivel salvar as configuracoes.");
  }
}
