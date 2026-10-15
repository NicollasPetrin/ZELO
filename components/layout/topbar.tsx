import Link from "next/link";
import { Bell, LogOut } from "lucide-react";
import { logoutAction } from "@/features/auth/actions";
import { CompanyAvatar } from "@/components/company-avatar";
import { MobileMenu, type SidebarProps } from "@/components/layout/sidebar";
import { buttonClassName } from "@/components/ui/button";
import { roleLabels } from "@/lib/labels";
import { planDetails } from "@/lib/plans";

export function Topbar({ userName, sidebar }: { userName: string; sidebar: SidebarProps }) {
  const { companyName, logoUrl, role, plan, inboxUnread } = sidebar;
  const activePlan = plan ? planDetails[plan] : null;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="flex h-14 items-center justify-between gap-3 px-4 lg:h-16 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <MobileMenu {...sidebar} />
          {/* No celular a barra lateral fica escondida; a logo aparece aqui para a empresa continuar reconhecivel. */}
          <CompanyAvatar name={companyName} logoUrl={logoUrl} className="h-8 w-8 text-xs lg:hidden" />
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-normal text-slate-500">{companyName}</p>
            <p className="truncate text-sm font-semibold text-slate-950">{userName} - {roleLabels[role]}</p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className={`hidden rounded-md border px-3 py-1.5 text-xs font-semibold sm:inline-flex ${activePlan ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            {activePlan ? `Plano ${activePlan.name}` : "Sem plano ativo"}
          </span>
          {/*
            `min-h-10` em vez de trocar o `h-8` do botao: duas utilitarias da
            mesma propriedade nao tem ordem garantida no CSS gerado, entao
            sobrescrever a altura direto sairia no sorteio. No dedo o alvo passa
            a ter 40px; no desktop o `lg:min-h-0` devolve os 32px originais.
          */}
          <Link
            href="/notifications"
            className={buttonClassName("secondary", "sm") + " min-h-10 lg:min-h-0"}
            aria-label={inboxUnread > 0 ? `Abrir notificacoes, ${inboxUnread} nao lidas` : "Abrir notificacoes"}
          >
            <Bell className="h-4 w-4" aria-hidden="true" />
            {inboxUnread > 0 ? <span aria-hidden="true">{inboxUnread}</span> : null}
          </Link>
          <form action={logoutAction}>
            <button className={buttonClassName("ghost", "sm") + " min-h-10 lg:min-h-0"} type="submit" aria-label="Sair">
              <LogOut className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
