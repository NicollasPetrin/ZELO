import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Building2, CreditCard, TrendingUp, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { buttonClassName } from "@/components/ui/button";
import { getPlatformOverview } from "@/features/admin/data";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";

export const metadata: Metadata = {
  title: "Plataforma - Zelo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function brl(cents: number) {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function Numero({
  label,
  valor,
  detalhe,
  icone,
  tom = "neutro",
}: {
  label: string;
  valor: string;
  detalhe?: string;
  icone: React.ReactNode;
  tom?: "neutro" | "atencao";
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span className={tom === "atencao" ? "text-amber-600" : "text-emerald-700"} aria-hidden="true">
          {icone}
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-950">{valor}</p>
      {detalhe ? <p className="mt-1 text-sm text-slate-500">{detalhe}</p> : null}
    </div>
  );
}

export default async function AdminPage() {
  const user = await requirePlatformAdmin();
  const { assinantes, porPlano, receita, contas } = await getPlatformOverview();
  const pagantes = assinantes.ativas + assinantes.inadimplentes;

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-4 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <BrandLogo variant="icon" decorative className="h-9 w-9" />
            <div>
              <p className="font-semibold text-slate-950">Plataforma</p>
              <p className="text-xs text-slate-500">{user.email}</p>
            </div>
          </div>
          <Link href="/dashboard" className={buttonClassName("secondary", "sm") + " min-h-10 lg:min-h-0"}>
            Ir para minha empresa
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 lg:px-8">
        <h1 className="text-2xl font-semibold text-slate-950">Assinaturas e receita</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Números de todas as empresas, sem contas de demonstração. Atualizado a cada carregamento.
        </p>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Numero
            label="Assinaturas pagantes"
            valor={String(pagantes)}
            detalhe={`${assinantes.ativas} em dia · ${assinantes.inadimplentes} inadimplentes`}
            icone={<CreditCard className="h-5 w-5" />}
          />
          <Numero
            label="Em teste"
            valor={String(assinantes.emTeste)}
            detalhe={`${brl(receita.emTesteCents)} por mês se converterem`}
            icone={<TrendingUp className="h-5 w-5" />}
          />
          <Numero
            label="Receita recorrente"
            valor={brl(receita.recorrenteCents)}
            detalhe="Soma dos planos em dia, por mês"
            icone={<TrendingUp className="h-5 w-5" />}
          />
          <Numero
            label="Cancelamentos agendados"
            valor={String(assinantes.cancelamentosAgendados)}
            detalhe="Valem até o fim do período pago"
            icone={<AlertTriangle className="h-5 w-5" />}
            tom={assinantes.cancelamentosAgendados > 0 ? "atencao" : "neutro"}
          />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-slate-950">Por plano</h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500">Plano</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500">Em dia</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500">Em teste</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500">Inadimplentes</th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-500">Recorrente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {porPlano.map((plano) => (
                    <tr key={plano.code}>
                      <td className="px-4 py-3 font-medium text-slate-950">
                        {plano.name}
                        <span className="ml-2 text-xs text-slate-500">{brl(plano.priceCents)}/mês</span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{plano.ativas}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{plano.emTeste}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-slate-700">{plano.inadimplentes}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium text-slate-950">
                        {brl(plano.ativas * plano.priceCents)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Numero
            label="Empresas cadastradas"
            valor={String(contas.empresas)}
            detalhe={`${contas.empresasNovasTrintaDias} nos últimos 30 dias`}
            icone={<Building2 className="h-5 w-5" />}
          />
          <Numero
            label="Pessoas ativas"
            valor={String(contas.usuariosAtivos)}
            detalhe="Somando todas as empresas"
            icone={<Users className="h-5 w-5" />}
          />
          <Numero
            label="Recebido em 30 dias"
            valor={brl(receita.recebidoTrintaDiasCents)}
            detalhe={`${receita.faturasPagasTrintaDias} faturas pagas`}
            icone={<CreditCard className="h-5 w-5" />}
          />
          <Numero
            label="Faturas em aberto"
            valor={String(receita.faturasEmAberto)}
            detalhe={`${brl(receita.recebidoTotalCents)} recebidos desde o início`}
            icone={<AlertTriangle className="h-5 w-5" />}
            tom={receita.faturasEmAberto > 0 ? "atencao" : "neutro"}
          />
        </section>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-950">Visitas ao site</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            A Zelo não registra visitas, então este painel não tem esse número para mostrar — e inventar um seria pior
            que não ter. O site já passa pela Cloudflare, que conta visitantes, páginas e origem do tráfego sem
            nenhuma alteração no código.
          </p>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Se preferir o dado aqui dentro, dá para registrar cada visita à landing em uma tabela própria e somar por
            dia. É a opção mais trabalhosa e a que exige aviso na política de privacidade.
          </p>
        </section>
      </div>
    </main>
  );
}
