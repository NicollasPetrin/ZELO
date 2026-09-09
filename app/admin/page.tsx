import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Building2, CreditCard, LifeBuoy, PlugZap, TrendingUp, Users } from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { buttonClassName } from "@/components/ui/button";
import { getPlatformOverview } from "@/features/admin/data";
import { StorageCheck } from "@/features/admin/storage-check";
import { listSupportThreads } from "@/features/admin/support";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { isStorageConfigured } from "@/lib/env";

export const metadata: Metadata = {
  title: "Plataforma - Zelo",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

const HORA_MS = 60 * 60 * 1000;

function horasDesde(data: Date) {
  return Math.floor((Date.now() - data.getTime()) / HORA_MS);
}

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
  const [{ assinantes, porPlano, receita, contas, cobranca }, suporte] = await Promise.all([
    getPlatformOverview(),
    listSupportThreads(),
  ]);
  const suporteEsperando = suporte.filter((conversa) => conversa.waiting).length;
  const pagantes = assinantes.ativas + assinantes.inadimplentes;
  // Silencio prolongado da processadora ou empresa parada sem plano: os dois
  // sao sintoma do mesmo defeito, o aviso de pagamento que nao chegou.
  const integracaoComProblema =
    cobranca.empresasTravadas > 0 ||
    !cobranca.ultimoWebhookEm ||
    horasDesde(cobranca.ultimoWebhookEm) > 48;

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
          <div className="flex items-center gap-2">
            <Link href="/admin/suporte" className={buttonClassName("secondary", "sm") + " min-h-10 lg:min-h-0"}>
              <LifeBuoy className="h-3.5 w-3.5" aria-hidden="true" />
              Suporte
              {suporteEsperando > 0 ? (
                <span className="ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-semibold text-white">
                  {suporteEsperando}
                </span>
              ) : null}
            </Link>
            <Link href="/dashboard" className={buttonClassName("secondary", "sm") + " min-h-10 lg:min-h-0"}>
              Ir para minha empresa
            </Link>
          </div>
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

        <section
          className={`mt-8 rounded-lg border p-5 ${
            integracaoComProblema ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-white"
          }`}
        >
          <div className="flex items-center gap-2">
            <PlugZap
              className={`h-5 w-5 ${integracaoComProblema ? "text-amber-600" : "text-emerald-700"}`}
              aria-hidden="true"
            />
            <h2 className="text-base font-semibold text-slate-950">Integração de cobrança</h2>
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-sm text-slate-500">Último aviso da processadora</dt>
              <dd className="mt-1 font-semibold tabular-nums text-slate-950">
                {cobranca.ultimoWebhookEm
                  ? `${horasDesde(cobranca.ultimoWebhookEm)} h atrás`
                  : "nunca"}
              </dd>
              <dd className="text-xs text-slate-500">{cobranca.ultimoWebhookEvento ?? "sem registro"}</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Avisos em 7 dias</dt>
              <dd className="mt-1 font-semibold tabular-nums text-slate-950">{cobranca.webhooksSeteDias}</dd>
              <dd className="text-xs text-slate-500">{cobranca.webhooksComFalhaSeteDias} sem efeito</dd>
            </div>
            <div>
              <dt className="text-sm text-slate-500">Empresas travadas</dt>
              <dd className="mt-1 font-semibold tabular-nums text-slate-950">{cobranca.empresasTravadas}</dd>
              <dd className="text-xs text-slate-500">iniciaram compra e estão sem plano</dd>
            </div>
          </dl>
          {integracaoComProblema ? (
            <p className="mt-4 text-sm leading-6 text-amber-950">
              Um pagamento que não vira plano não aparece em nenhum número de receita: a empresa fica parada com a
              compra iniciada e sem assinatura. Confira em Integrações → Webhooks se a fila do Asaas está
              interrompida, e veja os logs de entrega. Cada cliente nessa situação também consegue se destravar
              sozinho pelo botão &quot;Já paguei, conferir agora&quot; nas Configurações.
            </p>
          ) : null}
        </section>

        <section className="mt-8 rounded-lg border border-slate-200 bg-white p-5">
          <h2 className="text-base font-semibold text-slate-950">Armazenamento das provas</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            As fotos que comprovam conclusao de tarefa ficam no Cloudflare R2, fora do banco. O teste abaixo grava, le
            e apaga um arquivo descartavel: e a unica forma de saber se a credencial e o bucket estao certos, porque a
            assinatura das requisicoes so pode ser conferida pelo proprio servico.
          </p>
          <div className="mt-4">
            <StorageCheck configured={isStorageConfigured()} />
          </div>
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
