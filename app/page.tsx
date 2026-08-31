import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BellRing,
  Check,
  CheckCircle2,
  Clock3,
  Layers3,
  ShieldCheck,
  Sparkles,
  Star,
  UsersRound,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { ProductCarousel } from "@/components/product-carousel";
import { SiteFooter } from "@/components/site-footer";
import { buttonClassName } from "@/components/ui/button";
import { planDetails, planDifferences, planOrder } from "@/lib/plans";
import { TRIAL_DAYS } from "@/lib/subscription";

/*
  Antes havia tres numeros de mercado aqui: "12 mil+ tarefas organizadas por
  mes", "98% dos gestores entendem o painel no primeiro acesso" e "7 dias para
  tirar a rotina do improviso". Nenhum vinha de medicao, e o de 98% descrevia
  uma pesquisa que nao existe. Estatistica inventada em pagina de venda e
  afirmacao falsa ao consumidor, nao licenca de marketing.

  No lugar entram fatos que o proprio codigo sustenta: o teste vem de
  TRIAL_DAYS, os papeis de lib/permissions e os usuarios incluidos de
  lib/plans. Se um dia mudarem la, mudam aqui.
*/
const productFacts = [
  { value: `${TRIAL_DAYS} dias`, label: "de teste antes da primeira cobranca" },
  { value: "3 papeis", label: "dono, gerente e funcionario, cada um com seu acesso" },
  {
    value: `${planDetails.BASIC.includedUsers} usuarios`,
    label: "ja inclusos no plano de entrada",
  },
];

const features = [
  {
    icon: CheckCircle2,
    title: "Tarefas com dono, prazo e setor",
    description: "Cada funcionario sabe o que fazer hoje, o que esta atrasado e o que precisa ser concluido primeiro.",
  },
  {
    icon: BarChart3,
    title: "Painel que mostra onde apertar",
    description: "O gestor acompanha pendencias, urgencias, atrasos, metas e setores que precisam de atencao.",
  },
  {
    icon: BellRing,
    title: "Notificacoes internas",
    description: "Eventos importantes ficam dentro da plataforma: tarefa atribuida, comentario novo e status atualizado.",
  },
  {
    icon: Layers3,
    title: "Setores editaveis",
    description: "Comece com setores padrao e adapte a estrutura para o jeito real da empresa trabalhar.",
  },
];

// Descricoes conferidas no proprio produto: os setores padrao vem de
// DEFAULT_DEPARTMENTS no cadastro, e os papeis, de lib/permissions.
const steps = [
  {
    title: "Crie a conta da empresa",
    description:
      "A empresa ja nasce com os setores Gestao, Operacao e Atendimento, e voce ajusta a estrutura para o jeito real de trabalhar.",
  },
  {
    title: "Cadastre a equipe e distribua",
    description:
      "Cada tarefa recebe dono, prazo e setor. Dono, gerente e funcionario veem fluxos diferentes, com os dados administrativos protegidos.",
  },
  {
    title: "Acompanhe pelo painel",
    description:
      "Pendencias, atrasos, urgencias e metas aparecem em uma tela so, e os relatorios mostram o desempenho por setor e por responsavel.",
  },
];

const plans = planOrder.map((plan) => planDetails[plan]);
// Plano de entrada dos botoes principais. Sem plano na URL, o cadastro mostra o
// formulario curto e a pessoa nao chega ao pagamento — era por isso que os CTAs
// levavam a uma tela sem saida.
const planoDestaque = plans.find((plan) => plan.highlight) ?? plans[0];
const inicioDoTeste = `/signup?plano=${planoDestaque.code}&teste=1`;

export default function Home() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <section className="relative min-h-[88vh] overflow-hidden bg-slate-950 text-white">
        <Image
          src="/landing-hero.png"
          alt="Gestores de microempresa acompanhando um painel de equipe"
          fill
          preload
          className="object-cover object-center"
          sizes="100vw"
        />
        {/* Dois veus empilhados apagavam a foto quase por completo. O escurecimento chapado cede, e o gradiente segue garantindo o contraste do texto, que fica na metade esquerda. */}
        <div className="absolute inset-0 bg-slate-950/55" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(15,23,42,0.88)_34%,rgba(15,23,42,0.34)_72%,rgba(15,23,42,0.12)_100%)]" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo variant="iconDark" decorative className="h-10 w-10" preload />
            <span>
              <span className="block text-base font-semibold">Zelo</span>
              <span className="block text-xs text-slate-300">Gestao simples da operacao</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-slate-200 md:flex">
            <a href="#produto" className="hover:text-white">Produto</a>
            <a href="#como-funciona" className="hover:text-white">Como funciona</a>
            <a href="#demonstracao" className="hover:text-white">Demonstracao</a>
            <a href="#planos" className="hover:text-white">Planos</a>
          </nav>
          <Link href="/login" className={buttonClassName("secondary", "sm") + " min-h-10 lg:min-h-0"}>
            Entrar
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-center px-4 pb-14 pt-10 lg:min-h-[calc(88vh-80px)] lg:px-8 lg:pb-20 lg:pt-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-slate-100">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Plataforma SaaS para microempresas em crescimento
            </div>
            {/*
              A logomarca era o h1, com um sr-only escrito "Zelo". Para busca e
              para leitor de tela, o titulo da pagina era uma palavra sem
              proposta nenhuma. Ela continua igual na tela, agora como imagem
              decorativa, e o h1 passa a dizer o que o produto faz.
            */}
            <BrandLogo
              variant="fullDark"
              className="mt-6 h-auto w-[300px] max-w-full drop-shadow-[0_18px_36px_rgba(0,0,0,0.45)] sm:w-[420px]"
              preload
              decorative
            />
            <h1 className="mt-6 text-4xl font-semibold leading-tight text-white md:text-5xl">
              Organize tarefas, prazos e equipe em um lugar so.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
              A Zelo e a plataforma de gestao da operacao para microempresas que cresceram rapido e precisam sair do improviso.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href={inicioDoTeste} className={buttonClassName("light")}>
                Testar {TRIAL_DAYS} dias gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#planos" className={buttonClassName("secondary") + " border-white/25 bg-white/10 text-white hover:bg-white/15"}>
                Ver planos
              </a>
            </div>
          </div>

          <div className="mt-14 grid max-w-4xl gap-3 sm:grid-cols-3">
            {productFacts.map((item) => (
              <div key={item.label} className="border-l border-white/25 pl-4">
                <p className="text-2xl font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-sm leading-5 text-slate-300">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="produto" className="bg-white px-4 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-700">Produto</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 md:text-4xl">
              O controle que uma microempresa precisa, sem virar uma ferramenta complicada.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              A Zelo foi desenhada para operacoes que cresceram rapido e precisam sair do improviso. A experiencia e direta: o gestor acompanha a empresa, o gerente organiza a rotina e o funcionario ve exatamente suas tarefas.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article
                  key={feature.title}
                  className="rounded-xl bg-white p-6 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5 transition-shadow hover:shadow-[0_16px_40px_-12px_rgba(15,23,42,0.22)]"
                >
                  <Icon className="h-6 w-6 text-emerald-700" aria-hidden="true" />
                  <h3 className="mt-5 text-base font-semibold text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="bg-slate-50 px-4 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-700">Como funciona</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 md:text-4xl">
              Do cadastro a equipe organizada em tres passos.
            </h2>
          </div>

          {/*
            Sem a casca de cartao de proposito: com a mesma moldura dos recursos
            logo acima, tres passos viravam mais uma grade de caixas. O filete no
            topo e o numeral grande fazem a sequencia ser lida como sequencia.
          */}
          <ol className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
            {steps.map((step, index) => (
              <li key={step.title} className="border-t-2 border-emerald-600/25 pt-5">
                <span className="text-3xl font-bold text-emerald-700">{`0${index + 1}`}</span>
                <h3 className="mt-3 text-base font-semibold text-slate-950">{step.title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{step.description}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="demonstracao" className="relative overflow-hidden bg-slate-950 px-4 py-14 text-white lg:px-8 lg:py-20">
        {/* Luz difusa no topo. O fundo chapado deixava a secao com aparencia de
            bloco solido; isto da profundidade sem competir com a captura. */}
        <div
          className="pointer-events-none absolute inset-x-0 -top-40 h-80 bg-[radial-gradient(60%_100%_at_50%_100%,rgba(16,185,129,0.14),transparent)]"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-400">Demonstracao</p>
            <h2 className="mt-3 text-3xl font-semibold leading-tight text-white md:text-4xl">
              Veja a Zelo por dentro.
            </h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">
              As telas que o gestor usa no dia a dia: acompanhamento da operacao, organizacao das tarefas da equipe e leitura dos indicadores.
            </p>
          </div>

          <div className="mt-10">
            <ProductCarousel />
          </div>
        </div>
      </section>

      <section className="bg-white px-4 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          {[
            { icon: UsersRound, title: "Onboarding no produto", text: "Guias por aba mostram ao gestor como configurar setores, funcionarios, tarefas e metas dentro da plataforma." },
            { icon: ShieldCheck, title: "Permissoes por papel", text: "Dono, gerente e funcionario veem fluxos diferentes, com dados administrativos protegidos." },
            { icon: Clock3, title: "Rotina recorrente", text: "Cadastre tarefas diarias, semanais ou mensais para manter processos importantes sempre visiveis." },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/15">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-950">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{item.text}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section id="planos" className="bg-slate-50 px-4 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-700">Planos</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">Planos para cada fase da operacao.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-600">
              O Basico organiza a entrada, o Gestao concentra o melhor equilibrio entre preco e valor, e o Completo libera relatorios executivos e controles avancados para operacoes maiores.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-xl p-7 lg:p-8 ${
                  plan.highlight
                    ? "bg-slate-950 text-white shadow-[0_24px_50px_-18px_rgba(15,23,42,0.55)]"
                    : "bg-white text-slate-950 shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5"
                }`}
              >
                <div
                  className={`mb-5 inline-flex items-center gap-2 rounded-md px-3 py-1 text-xs font-semibold ${
                    plan.highlight ? "bg-emerald-400 text-slate-950" : "bg-slate-100 text-slate-700"
                  }`}
                >
                  {plan.highlight ? <Star className="h-3.5 w-3.5" aria-hidden="true" /> : null}
                  {plan.label}
                </div>
                <h3 className="text-xl font-semibold">{plan.name}</h3>
                <p className={`mt-3 text-sm leading-6 ${plan.highlight ? "text-slate-300" : "text-slate-600"}`}>{plan.description}</p>
                <div className="mt-6 flex items-end gap-1">
                  {/* O preco e o que a pessoa vem comparar: com o mesmo peso do resto do cartao, ela precisa procurar. */}
                  <span className={`text-5xl font-bold ${plan.highlight ? "text-emerald-300" : "text-emerald-700"}`}>
                    {plan.price}
                  </span>
                  <span className={plan.highlight ? "pb-1 text-sm text-slate-300" : "pb-1 text-sm text-slate-500"}>/mes</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check className={`mt-0.5 h-4 w-4 shrink-0 ${plan.highlight ? "text-emerald-300" : "text-emerald-700"}`} aria-hidden="true" />
                      <span className={plan.highlight ? "text-slate-100" : "text-slate-700"}>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/signup?plano=${plan.code}&teste=1`}
                  className={
                    plan.highlight
                      ? buttonClassName("light") + " mt-7 w-full"
                      : buttonClassName("secondary") + " mt-7 w-full"
                  }
                >
                  Testar {TRIAL_DAYS} dias gratis
                </Link>
                <Link
                  href={`/signup?plano=${plan.code}`}
                  // py-2 nao muda a aparencia e leva o alvo de 16px para 32px: no dedo, 16px e menor que a ponta que precisa acerta-lo.
                  className={`mt-1 block py-2 text-center text-xs ${plan.highlight ? "text-slate-300 hover:text-white" : "text-slate-500 hover:text-slate-800"}`}
                >
                  Assinar direto, sem teste
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-10 overflow-hidden rounded-xl bg-white shadow-[0_10px_30px_-12px_rgba(15,23,42,0.18)] ring-1 ring-slate-900/5">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <h3 className="text-base font-semibold text-slate-950">Diferencas principais entre os planos</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-white">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-slate-500">Funcionalidade</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-950">Basico</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-950">Gestao</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-950">Completo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {planDifferences.map((row) => (
                    <tr key={row.feature}>
                      <td className="px-4 py-3 font-medium text-slate-950">{row.feature}</td>
                      <td className="px-4 py-3 text-slate-600">{row.BASIC}</td>
                      <td className="px-4 py-3 text-slate-600">{row.MANAGEMENT}</td>
                      <td className="px-4 py-3 text-slate-600">{row.COMPLETE}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-950 px-4 py-14 lg:px-8 lg:py-20">
        <div className="mx-auto flex max-w-7xl flex-col gap-8 text-white md:flex-row md:items-center md:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-semibold leading-tight md:text-4xl">Comece a organizar sua equipe.</h2>
            <p className="mt-4 text-lg leading-8 text-slate-300">Crie uma conta, cadastre sua empresa e mantenha tarefas, metas e setores salvos em um unico lugar.</p>
          </div>
          <Link href={inicioDoTeste} className={buttonClassName("light")}>
            Testar {TRIAL_DAYS} dias gratis
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
