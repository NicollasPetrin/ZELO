import { Check, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CompanySettingsForm } from "@/features/settings/company-settings-form";
import { requireCompanyManager } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { calculateMonthlyPrice, formatPriceCents, getPlanAccess, planDetails, planOrder } from "@/lib/plans";
import { getActivePlanCode } from "@/lib/subscription";

export default async function SettingsPage() {
  const user = await requireCompanyManager();
  const activePlanCode = getActivePlanCode(user.company);
  const activePlan = activePlanCode ? planDetails[activePlanCode] : null;
  const access = getPlanAccess(activePlanCode);
  const activeUserCount = activePlanCode
    ? await prisma.user.count({
        where: {
          companyId: user.companyId,
          isActive: true,
        },
      })
    : 0;
  const monthlyPrice = activePlanCode ? calculateMonthlyPrice(activePlanCode, activeUserCount) : null;
  const currentMonthlyTotal =
    monthlyPrice?.totalPriceCents === null
      ? "Upgrade necessario"
      : monthlyPrice
        ? formatPriceCents(monthlyPrice.totalPriceCents)
        : "A contratar";
  const extraUsers = monthlyPrice?.extraUsers ?? 0;
  const extraUsersPrice = formatPriceCents(monthlyPrice?.extraUsersPriceCents ?? 0);
  const maxUsersLabel = activePlan ? (access.maxUsers === null ? "Ilimitado" : `Ate ${access.maxUsers}`) : "Nenhum";
  const activeFeatures = activePlan?.features ?? [
    "Cadastro da empresa criado",
    "Dados separados por empresa",
    "Funcionalidades operacionais liberadas apos assinatura ativa",
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Configuracoes"
        description="Ajustes basicos da empresa, assinatura e informacoes do usuario logado."
      />

      <section id="gerenciamento-assinatura" className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-5">
          <h2 className="text-base font-semibold text-slate-950">Gerenciamento de assinatura</h2>
          <p className="mt-1 text-sm leading-6 text-slate-600">
            Consulte o plano ativo, usuarios incluidos, custo por usuario extra e funcionalidades contratadas.
          </p>
        </div>
        <div className="grid gap-5 lg:grid-cols-[0.75fr_1.25fr] lg:items-start">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
              <CreditCard className="h-4 w-4" aria-hidden="true" />
              {activePlan ? "Plano ativo" : "Sem plano ativo"}
            </div>
            <h3 className="mt-3 text-xl font-semibold text-slate-950">{activePlan?.name ?? "Assinatura pendente"}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {activePlan?.description ?? "Escolha um plano para liberar tarefas, metas, funcionarios, relatorios e demais rotinas da empresa."}
            </p>
            <p className="mt-4 text-xs font-medium uppercase tracking-normal text-slate-400">Mensalidade atual</p>
            <p className="mt-1 text-2xl font-semibold text-slate-950">
              {currentMonthlyTotal}
              {activePlan ? <span className="text-sm font-medium text-slate-500">/mes</span> : null}
            </p>
            <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Base do plano</dt>
                <dd className="mt-1 font-semibold text-slate-950">{activePlan?.price ?? "-"}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Incluidos</dt>
                <dd className="mt-1 font-semibold text-slate-950">{activePlan ? `Ate ${access.includedUsers}` : "0"}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Usuarios ativos</dt>
                <dd className="mt-1 font-semibold text-slate-950">{activeUserCount}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Usuario extra</dt>
                <dd className="mt-1 font-semibold text-slate-950">{activePlan ? `${activePlan.pricePerExtraUser}/mes` : "-"}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Extras cobrados</dt>
                <dd className="mt-1 font-semibold text-slate-950">{extraUsers}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Adicional mensal</dt>
                <dd className="mt-1 font-semibold text-slate-950">{extraUsersPrice}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Teto</dt>
                <dd className="mt-1 font-semibold text-slate-950">{maxUsersLabel}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Painel</dt>
                <dd className="mt-1 font-semibold text-slate-950">{access.dashboardName}</dd>
              </div>
            </dl>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              {activePlan ? "Funcionalidades desta assinatura" : "Status da conta"}
            </h3>
            <ul className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
              {activeFeatures.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-6 border-t border-slate-100 pt-5">
          <h3 className="text-sm font-semibold text-slate-950">Planos disponiveis</h3>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {planOrder.map((planCode) => {
              const plan = planDetails[planCode];
              const isCurrent = activePlanCode === planCode;

              return (
                <article key={plan.code} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-slate-950">{plan.name}</h4>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{plan.shortDescription}</p>
                    </div>
                    {isCurrent ? (
                      <span className="rounded-md bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">Atual</span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-lg font-semibold text-slate-950">
                    {plan.price}
                    <span className="text-xs font-medium text-slate-500">/mes</span>
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    {plan.includedUsers} usuarios incluidos, {plan.pricePerExtraUser}/mes por usuario extra.
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <CompanySettingsForm
        company={{
          name: user.company.name,
          segment: user.company.segment,
          employeeCount: user.company.employeeCount,
          isActive: user.company.isActive,
        }}
      />

      <section className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-950">Seu acesso</h2>
        <dl className="mt-4 grid gap-3 text-sm text-slate-600 md:grid-cols-3">
          <div>
            <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Nome</dt>
            <dd>{user.name}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">E-mail</dt>
            <dd>{user.email}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Setor</dt>
            <dd>{user.department?.name ?? "Sem setor"}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}
