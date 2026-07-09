import { Building2, Power, Trash2 } from "lucide-react";
import { DataTable, Td, Th } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { OnboardingCard } from "@/components/onboarding-card";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { buttonClassName } from "@/components/ui/button";
import { deleteDepartmentAction, toggleDepartmentAction } from "@/features/departments/actions";
import { listDepartments } from "@/features/departments/data";
import { DepartmentForm } from "@/features/departments/department-form";
import { requireTeamArea } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { isOnboardingCompleted } from "@/lib/onboarding";
import { canManageCompany } from "@/lib/permissions";

export default async function DepartmentsPage() {
  const user = await requireTeamArea();

  const [departments, onboardingCompleted] = await Promise.all([
    listDepartments(user.companyId),
    isOnboardingCompleted(user.id, "departments"),
  ]);

  const canManage = canManageCompany(user.role);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Setores"
        description="Confirme os setores da empresa. Ja deixamos setores padrao criados para facilitar o inicio."
      />

      <OnboardingCard
        stepKey="departments"
        title="Comece confirmando os setores da sua empresa"
        description="Ja deixamos alguns setores padrao criados para facilitar. Voce pode editar, inativar ou criar novos setores."
        completed={onboardingCompleted}
      />

      {canManage ? <DepartmentForm /> : null}

      {departments.length ? (
        <DataTable>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Setor</Th>
                <Th>Status</Th>
                <Th>Pessoas</Th>
                <Th>Tarefas</Th>
                <Th>Metas</Th>
                <Th>Criado em</Th>
                {canManage ? <Th>Acoes</Th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {departments.map((department) => (
                <tr key={department.id}>
                  <Td>
                    <div className="flex items-start gap-3">
                      <Building2 className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-slate-950">{department.name}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">{department.description ?? "Sem descricao cadastrada."}</p>
                        {canManage ? (
                          <details className="mt-3">
                            <summary className="text-xs font-medium text-slate-600">Editar setor</summary>
                            <div className="mt-3">
                              <DepartmentForm
                                compact
                                initial={{
                                  id: department.id,
                                  name: department.name,
                                  description: department.description ?? "",
                                  isActive: department.isActive,
                                }}
                              />
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <Badge className={department.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                      {department.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </Td>
                  <Td>{department._count.users}</Td>
                  <Td>{department._count.tasks}</Td>
                  <Td>{department._count.goals}</Td>
                  <Td>{formatDate(department.createdAt)}</Td>
                  {canManage ? (
                    <Td>
                      <div className="flex flex-wrap gap-2">
                        <form
                          action={async () => {
                            "use server";
                            await toggleDepartmentAction(department.id, !department.isActive);
                          }}
                        >
                          <button className={buttonClassName("secondary", "sm")} type="submit">
                            <Power className="h-3.5 w-3.5" />
                            {department.isActive ? "Inativar" : "Ativar"}
                          </button>
                        </form>
                        <form
                          action={async () => {
                            "use server";
                            await deleteDepartmentAction(department.id);
                          }}
                        >
                          <button className={buttonClassName("ghost", "sm")} type="submit">
                            <Trash2 className="h-3.5 w-3.5" />
                            Excluir
                          </button>
                        </form>
                      </div>
                    </Td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      ) : (
        <EmptyState
          title="Nenhum setor cadastrado"
          description="Crie setores para organizar responsabilidades, tarefas e metas por area da empresa."
        />
      )}
    </div>
  );
}
