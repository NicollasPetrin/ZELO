import { UserRound } from "lucide-react";
import { DataTable, Td, Th } from "@/components/data-table";
import { EmptyState } from "@/components/empty-state";
import { LockedFeatureCard } from "@/components/locked-feature-card";
import { OnboardingCard } from "@/components/onboarding-card";
import { Pagination } from "@/components/pagination";
import { PageHeader } from "@/components/page-header";
import { SubscriptionRequiredCard } from "@/components/subscription-required-card";
import { Badge } from "@/components/ui/badge";
import { listEmployees } from "@/features/employees/data";
import { EmployeeDeleteButton } from "@/features/employees/employee-delete-button";
import { EmployeeForm } from "@/features/employees/employee-form";
import { EmployeeStatusButton } from "@/features/employees/employee-status-button";
import { listActiveDepartments } from "@/features/departments/data";
import { requireCompanyManager } from "@/lib/auth/guards";
import { formatDate } from "@/lib/format";
import { roleLabels } from "@/lib/labels";
import { isOnboardingCompleted } from "@/lib/onboarding";
import { parsePage } from "@/lib/pagination";
import { calculateMonthlyPrice, formatPriceCents, getPlanAccess, planDetails } from "@/lib/plans";
import { SearchParams, searchValue } from "@/lib/search";
import { getActivePlanCode } from "@/lib/subscription";

export default async function EmployeesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const user = await requireCompanyManager();
  const activePlanCode = getActivePlanCode(user.company);
  if (!activePlanCode) {
    return <SubscriptionRequiredCard />;
  }

  const activePlan = planDetails[activePlanCode];
  const access = getPlanAccess(activePlanCode);
  const params = await searchParams;
  const page = parsePage(searchValue(params, "page"));

  const [employeePage, departments, onboardingCompleted] = await Promise.all([
    listEmployees(user.companyId, page),
    listActiveDepartments(user.companyId),
    isOnboardingCompleted(user, "employees"),
  ]);
  const employees = employeePage.items;
  const activeEmployees = employeePage.activeUserCount;
  const reachedLimit = access.maxUsers !== null && activeEmployees >= access.maxUsers;
  const maxUsersLabel = access.maxUsers === null ? "ilimitado" : String(access.maxUsers);
  const currentPrice = calculateMonthlyPrice(activePlanCode, activeEmployees);
  const nextPrice = calculateMonthlyPrice(activePlanCode, activeEmployees + 1);
  const billing = {
    planName: activePlan.name,
    activeUserCount: activeEmployees,
    includedUsers: access.includedUsers,
    maxUsers: access.maxUsers,
    pricePerExtraUser: activePlan.pricePerExtraUser,
    currentMonthlyTotal: currentPrice.totalPriceCents === null ? "Upgrade necessario" : formatPriceCents(currentPrice.totalPriceCents),
    nextMonthlyTotal: nextPrice.totalPriceCents === null ? "Upgrade necessario" : formatPriceCents(nextPrice.totalPriceCents),
    upgradePlanName: activePlanCode === "BASIC" ? "Gestao" : "Completo",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funcionarios"
        description={`Cadastre sua equipe, defina papel, setor e cargo. Plano ${activePlan.name}: ${access.includedUsers} usuarios incluidos e teto ${maxUsersLabel}.`}
      />

      <OnboardingCard
        stepKey="employees"
        title="Cadastre sua equipe e defina a funcao de cada pessoa"
        description="Depois, voce podera atribuir tarefas e acompanhar o andamento por responsavel e setor."
        completed={onboardingCompleted}
      />

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-950">Uso do plano</h2>
            <p className="mt-1 text-sm text-slate-600">
              {activeEmployees} usuarios ativos. {access.includedUsers} incluidos no Plano {activePlan.name}; usuario extra custa {activePlan.pricePerExtraUser}/mes.
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-950">Mensalidade atual: {billing.currentMonthlyTotal}</p>
          </div>
          <span className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
            Teto {maxUsersLabel}
          </span>
        </div>
      </section>

      {reachedLimit ? (
        <LockedFeatureCard
          title="Limite de usuarios atingido"
          description="Para adicionar mais pessoas ativas, evolua para um plano com limite maior."
          requiredPlan={activePlanCode === "BASIC" ? "Gestao" : "Completo"}
        />
      ) : (
        <EmployeeForm departments={departments} billing={billing} />
      )}

      {employees.length ? (
        <DataTable>
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <Th>Funcionario</Th>
                <Th>Papel</Th>
                <Th>Setor</Th>
                <Th>Tarefas</Th>
                <Th>Status</Th>
                <Th>Criado em</Th>
                <Th>Acoes</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {employees.map((employee) => (
                <tr key={employee.id}>
                  <Td>
                    <div className="flex items-start gap-3">
                      <UserRound className="mt-0.5 h-4 w-4 text-slate-400" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-slate-950">{employee.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{employee.email}</p>
                        <p className="mt-1 text-xs text-slate-500">{employee.position ?? "Sem cargo informado"}</p>
                        <details className="mt-3">
                          <summary className="text-xs font-medium text-slate-600">Editar funcionario</summary>
                          <div className="mt-3">
                            <EmployeeForm
                              compact
                              departments={departments}
                              billing={billing}
                              initial={{
                                id: employee.id,
                                name: employee.name,
                                email: employee.email,
                                role: employee.role,
                                departmentId: employee.departmentId ?? "",
                                position: employee.position ?? "",
                                isActive: employee.isActive,
                              }}
                            />
                          </div>
                        </details>
                      </div>
                    </div>
                  </Td>
                  <Td>{roleLabels[employee.role]}</Td>
                  <Td>{employee.department?.name ?? "Sem setor"}</Td>
                  <Td>{employee._count.assignedTasks}</Td>
                  <Td>
                    <Badge className={employee.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}>
                      {employee.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </Td>
                  <Td>{formatDate(employee.createdAt)}</Td>
                  <Td>
                    <div className="flex flex-col gap-2">
                      <EmployeeStatusButton employeeId={employee.id} isActive={employee.isActive} isCurrentUser={employee.id === user.id} billing={billing} />
                      <EmployeeDeleteButton employeeId={employee.id} employeeName={employee.name} isCurrentUser={employee.id === user.id} />
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      ) : (
        <EmptyState
          title="Cadastre sua equipe"
          description="Cadastre sua equipe para comecar a distribuir tarefas e acompanhar responsabilidades."
        />
      )}
      <Pagination {...employeePage} searchParams={params} />
    </div>
  );
}
