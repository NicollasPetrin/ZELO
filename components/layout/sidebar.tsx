"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  CalendarClock,
  CheckSquare,
  ChevronRight,
  Gauge,
  Goal,
  Home,
  Inbox,
  LayoutGrid,
  Lock,
  Menu,
  MessageSquare,
  Settings,
  Trophy,
  Users,
  X,
} from "lucide-react";
import type { SubscriptionPlan, UserRole } from "@prisma/client";
import { CompanyAvatar } from "@/components/company-avatar";
import type { SidebarSpace } from "@/features/layout/data";
import { cn } from "@/lib/cn";
import { roleLabels } from "@/lib/labels";
import { canManageCompany, canViewTeamArea } from "@/lib/permissions";
import { getPlanAccess, planDetails } from "@/lib/plans";

export type SidebarProps = {
  role: UserRole;
  plan: SubscriptionPlan | null;
  companyName: string;
  logoUrl: string | null;
  inboxUnread: number;
  chatUnread: number;
  /** Setores como espacos. Null quando a pessoa nao gerencia equipe. */
  spaces: SidebarSpace[] | null;
};

// Cor fixa por setor, tirada do nome: o mesmo setor tem sempre a mesma cor,
// sem precisar guardar nada.
const CORES = ["bg-sky-600", "bg-violet-600", "bg-rose-600", "bg-emerald-600", "bg-amber-600", "bg-teal-600", "bg-indigo-600", "bg-orange-600"];
function corDoSetor(nome: string) {
  let soma = 0;
  for (const letra of nome) {
    soma = (soma * 31 + letra.charCodeAt(0)) >>> 0;
  }
  return CORES[soma % CORES.length];
}

function Contador({ valor, tipo, rotulo, ativo }: { valor: number; tipo: "novo" | "atraso"; rotulo: string; ativo: boolean }) {
  if (valor <= 0) {
    return null;
  }
  return (
    <span
      title={rotulo}
      className={cn(
        "ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs font-semibold",
        ativo ? "bg-white text-slate-950" : tipo === "novo" ? "bg-emerald-600 text-white" : "bg-rose-100 text-rose-700",
      )}
    >
      {valor}
      <span className="sr-only"> {rotulo}</span>
    </span>
  );
}

function Item({
  href,
  label,
  icon,
  ativo,
  extra,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  ativo: boolean;
  extra?: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={ativo ? "page" : undefined}
      className={cn(
        "flex h-8 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors",
        ativo ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
      )}
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {extra}
    </Link>
  );
}

function Bloqueado({ label, icon, plano }: { label: string; icon: ReactNode; plano: string }) {
  return (
    <Link
      href="/settings#gerenciamento-assinatura"
      title={`Disponível a partir do Plano ${plano}`}
      className="flex h-8 items-center gap-3 rounded-md px-3 text-sm font-medium text-slate-400 hover:bg-slate-50"
    >
      {icon}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{plano}</span>
      <Lock className="h-3.5 w-3.5" aria-hidden="true" />
    </Link>
  );
}

function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <details open className="group">
      <summary className="mt-3 flex cursor-pointer list-none items-center gap-1.5 rounded px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:text-slate-600 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="h-3 w-3 transition-transform group-open:rotate-90" aria-hidden="true" />
        {titulo}
      </summary>
      <div className="mt-1 space-y-0.5">{children}</div>
    </details>
  );
}

const icone = (Icon: typeof Home) => <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />;

/**
 * Conteudo da barra lateral, o mesmo no computador e no menu do celular.
 *
 * Organizada como no ClickUp: atalhos do dia a dia no topo, os setores como
 * espacos (com o numero de atrasadas ao lado, que e o que o dono quer ver
 * primeiro), depois ferramentas e equipe.
 */
function SidebarContent({ role, plan, companyName, logoUrl, inboxUnread, chatUnread, spaces }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setorAtual = pathname === "/team-tasks" ? searchParams.get("departmentId") : null;
  const em = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const comPlano = Boolean(plan);
  const access = getPlanAccess(plan);
  const equipe = canViewTeamArea(role);
  const dono = canManageCompany(role);

  return (
    <div className="flex h-full flex-col">
      <Link href={comPlano ? "/inicio" : "/conversas"} className="flex items-center gap-3 rounded-md px-2 py-1 hover:bg-slate-50">
        <CompanyAvatar name={companyName} logoUrl={logoUrl} className="h-10 w-10 text-sm" />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-slate-950">{companyName}</span>
          <span className="block truncate text-xs text-slate-500">
            {plan ? `Plano ${planDetails[plan].name}` : "Sem plano ativo"} · {roleLabels[role]}
          </span>
        </span>
      </Link>

      <nav className="mt-4 min-h-0 flex-1 overflow-y-auto pb-4" aria-label="Navegação principal">
        {comPlano ? (
          <>
            <div className="space-y-0.5">
              <Item href="/inicio" label="Início" icon={icone(Home)} ativo={em("/inicio")} />
              <Item
                href="/notifications"
                label="Caixa de entrada"
                icon={icone(Inbox)}
                ativo={em("/notifications")}
                extra={<Contador valor={inboxUnread} tipo="novo" rotulo={inboxUnread === 1 ? "não lida" : "não lidas"} ativo={em("/notifications")} />}
              />
              <Item href="/my-tasks" label="Minhas tarefas" icon={icone(CheckSquare)} ativo={em("/my-tasks")} />
              <Item href="/agenda" label="Agenda" icon={icone(CalendarClock)} ativo={em("/agenda")} />
            </div>

            {equipe ? (
              <Secao titulo="Espaços">
                <Item
                  href="/team-tasks"
                  label="Todas as tarefas"
                  icon={icone(LayoutGrid)}
                  ativo={pathname === "/team-tasks" && !setorAtual}
                />
                {spaces ? (
                  <>
                    {spaces.map((espaco) => {
                      const ativo = setorAtual === espaco.id;
                      return (
                        <Item
                          key={espaco.id}
                          href={`/team-tasks?departmentId=${espaco.id}`}
                          label={espaco.name}
                          ativo={ativo}
                          icon={
                            <span
                              className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white", corDoSetor(espaco.name))}
                              aria-hidden="true"
                            >
                              {espaco.name.charAt(0).toUpperCase()}
                            </span>
                          }
                          extra={
                            <Contador
                              valor={espaco.late}
                              tipo="atraso"
                              rotulo={espaco.late === 1 ? "tarefa atrasada" : "tarefas atrasadas"}
                              ativo={ativo}
                            />
                          }
                        />
                      );
                    })}
                    <Link
                      href="/departments"
                      className={cn(
                        "block rounded-md px-3 py-1.5 pl-10 text-xs font-medium hover:bg-slate-100",
                        em("/departments") ? "text-slate-950" : "text-slate-500",
                      )}
                    >
                      Gerenciar setores
                    </Link>
                  </>
                ) : (
                  <>
                    <Bloqueado label="Setores como espaços" icon={icone(LayoutGrid)} plano="Gestão" />
                    <Link href="/departments" className="block rounded-md px-3 py-1.5 pl-10 text-xs font-medium text-slate-500 hover:bg-slate-100">
                      Gerenciar setores
                    </Link>
                  </>
                )}
              </Secao>
            ) : null}

            <Secao titulo="Ferramentas">
              <Item href="/dashboard" label="Painel" icon={icone(Gauge)} ativo={em("/dashboard")} />
              {equipe ? (
                access.canUseBasicReports ? (
                  <Item href="/reports" label="Relatórios" icon={icone(BarChart3)} ativo={em("/reports")} />
                ) : (
                  <Bloqueado label="Relatórios" icon={icone(BarChart3)} plano="Gestão" />
                )
              ) : null}
              <Item href="/goals" label="Metas" icon={icone(Goal)} ativo={em("/goals")} />
              <Item href="/pontos" label="Pontos" icon={icone(Trophy)} ativo={em("/pontos")} />
            </Secao>

            <Secao titulo="Equipe">
              <Item
                href="/conversas"
                label="Conversas"
                icon={icone(MessageSquare)}
                ativo={em("/conversas")}
                extra={<Contador valor={chatUnread} tipo="novo" rotulo={chatUnread === 1 ? "conversa não lida" : "conversas não lidas"} ativo={em("/conversas")} />}
              />
              {dono ? <Item href="/employees" label="Funcionários" icon={icone(Users)} ativo={em("/employees")} /> : null}
            </Secao>
          </>
        ) : (
          <div className="space-y-0.5">
            <Item
              href="/conversas"
              label="Conversas"
              icon={icone(MessageSquare)}
              ativo={em("/conversas")}
              extra={<Contador valor={chatUnread} tipo="novo" rotulo={chatUnread === 1 ? "conversa não lida" : "conversas não lidas"} ativo={em("/conversas")} />}
            />
          </div>
        )}
      </nav>

      <div className="space-y-2 border-t border-slate-100 pt-3">
        {dono ? <Item href="/settings" label="Configurações" icon={icone(Settings)} ativo={em("/settings")} /> : null}
        <div className="rounded-md bg-slate-50 px-3 py-2">
          <p className="text-xs font-semibold text-slate-950">{plan ? `Plano ${planDetails[plan].name}` : "Sem plano ativo"}</p>
          <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
            {!plan
              ? "Escolha um plano para liberar o produto."
              : plan === "BASIC"
                ? "Setores, filtros e relatórios no Plano Gestão."
                : "Espaços, filtros e relatórios liberados."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function Sidebar(props: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 hidden w-72 border-r border-slate-200 bg-white px-3 py-4 lg:block">
      <SidebarContent {...props} />
    </aside>
  );
}

/** No celular a barra vira um menu que abre por cima da tela. */
export function MobileMenu(props: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [aberto, setAberto] = useState(false);
  const pendentes = props.inboxUnread + props.chatUnread;

  // Trocar de pagina fecha o menu.
  const [rota, setRota] = useState(`${pathname}?${searchParams.toString()}`);
  const rotaAtual = `${pathname}?${searchParams.toString()}`;
  if (rota !== rotaAtual) {
    setRota(rotaAtual);
    setAberto(false);
  }

  useEffect(() => {
    if (!aberto) {
      return;
    }
    const fecharNoEsc = (event: KeyboardEvent) => event.key === "Escape" && setAberto(false);
    document.addEventListener("keydown", fecharNoEsc);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", fecharNoEsc);
      document.body.style.overflow = overflow;
    };
  }, [aberto]);

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        aria-expanded={aberto}
        aria-controls="menu-celular"
        aria-label={pendentes > 0 ? `Abrir menu, ${pendentes} novidades` : "Abrir menu"}
        className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 text-slate-700 lg:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
        {pendentes > 0 ? <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-600" aria-hidden="true" /> : null}
      </button>

      {/* Pelo portal, direto no body: o topo usa backdrop-blur, e um elemento fixo dentro dele ficaria preso a altura do topo. */}
      {aberto
        ? createPortal(
            <div className="fixed inset-0 z-40 lg:hidden" id="menu-celular" role="dialog" aria-modal="true" aria-label="Menu">
              <button type="button" className="absolute inset-0 bg-slate-950/40" aria-label="Fechar menu" onClick={() => setAberto(false)} />
              <div className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col bg-white px-3 pb-4 pt-12 shadow-xl">
                <button
                  type="button"
                  onClick={() => setAberto(false)}
                  aria-label="Fechar menu"
                  className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
                <SidebarContent {...props} />
              </div>
            </div>,
          document.body,
        )
        : null}
    </>
  );
}
