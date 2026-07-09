import { Check, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { CompanySettingsForm } from "@/features/settings/company-settings-form";
import { requireCompanyManager } from "@/lib/auth/guards";
import { getPlanAccess, planDetails } from "@/lib/plans";

export default async function SettingsPage() {
  const user = await requireCompanyManager();
  const activePlan = planDetails[user.company.plan];
  const access = getPlanAccess(user.company.plan);
  const maxUsersLabel = access.maxUsers === null ? "Ilimitado" : `Ate ${access.maxUsers}`;

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
              Plano ativo
            </div>
            <h3 className="mt-3 text-xl font-semibold text-slate-950">{activePlan.name}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{activePlan.description}</p>
            <p className="mt-4 text-2xl font-semibold text-slate-950">
              {activePlan.price}
              <span className="text-sm font-medium text-slate-500">/mes</span>
            </p>
            <dl className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Incluidos</dt>
                <dd className="mt-1 font-semibold text-slate-950">Ate {access.includedUsers}</dd>
              </div>
              <div className="rounded-md bg-slate-50 p-3">
                <dt className="text-xs font-medium uppercase tracking-normal text-slate-400">Usuario extra</dt>
                <dd className="mt-1 font-semibold text-slate-950">{activePlan.pricePerExtraUser}/mes</dd>
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
            <h3 className="text-sm font-semibold text-slate-950">Funcionalidades desta assinatura</h3>
            <ul className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-2">
              {activePlan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
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
