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
import { buttonClassName } from "@/components/ui/button";
import { planDetails, planDifferences, planOrder } from "@/lib/plans";

const marketProof = [
  { value: "12 mil+", label: "tarefas organizadas por mes" },
  { value: "98%", label: "dos gestores entendem o painel no primeiro acesso" },
  { value: "7 dias", label: "para tirar a rotina do improviso" },
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

const plans = planOrder.map((plan) => planDetails[plan]);

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
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(2,6,23,0.96)_0%,rgba(15,23,42,0.88)_34%,rgba(15,23,42,0.34)_72%,rgba(15,23,42,0.12)_100%)]" />

        <header className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-4 py-5 lg:px-8">
          <Link href="/" className="flex items-center gap-3">
            <BrandLogo variant="iconDark" decorative className="h-10 w-10" priority />
            <span>
              <span className="block text-base font-semibold">Zelo</span>
              <span className="block text-xs text-slate-300">Gestao simples da operacao</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-slate-200 md:flex">
            <a href="#produto" className="hover:text-white">Produto</a>
            <a href="#planos" className="hover:text-white">Planos</a>
          </nav>
          <Link href="/login" className={buttonClassName("secondary", "sm")}>
            Entrar
          </Link>
        </header>

        <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-center px-4 pb-20 pt-14 lg:min-h-[calc(88vh-80px)] lg:px-8 lg:pt-20">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-white/20 bg-white/10 px-3 py-2 text-xs font-medium text-slate-100">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Plataforma SaaS para microempresas em crescimento
            </div>
            <h1 className="mt-6 text-5xl font-semibold leading-tight text-white md:text-6xl">
              <span className="sr-only">Zelo</span>
              <span className="inline-flex" aria-hidden="true">
                <BrandLogo variant="full" className="h-auto w-[280px] max-w-full sm:w-[380px]" priority decorative />
              </span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-200">
              Organize tarefas, prazos, setores, metas e visibilidade da equipe em uma plataforma simples, profissional e feita para donos e gerentes de microempresa.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/signup" className={buttonClassName("light")}>
                Criar conta
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a href="#planos" className={buttonClassName("secondary") + " border-white/25 bg-white/10 text-white hover:bg-white/15"}>
                Ver planos
              </a>
            </div>
          </div>

          <div className="mt-14 grid max-w-4xl gap-3 sm:grid-cols-3">
            {marketProof.map((item) => (
              <div key={item.label} className="border-l border-white/25 pl-4">
                <p className="text-2xl font-semibold text-white">{item.value}</p>
                <p className="mt-1 text-sm leading-5 text-slate-300">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="produto" className="border-b border-slate-200 bg-white px-4 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">Produto</p>
              <h2 className="mt-3 text-3xl font-semibold leading-tight text-slate-950 md:text-4xl">
                O controle que uma microempresa precisa, sem virar uma ferramenta complicada.
              </h2>
            </div>
            <p className="text-base leading-8 text-slate-600">
              A Zelo foi desenhada para operacoes que cresceram rapido e precisam sair do improviso. A experiencia e direta: o gestor acompanha a empresa, o gerente organiza a rotina e o funcionario ve exatamente suas tarefas.
            </p>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;

              return (
                <article key={feature.title} className="rounded-md border border-slate-200 bg-white p-5 shadow-sm">
                  <Icon className="h-6 w-6 text-emerald-700" aria-hidden="true" />
                  <h3 className="mt-5 text-base font-semibold text-slate-950">{feature.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">{feature.description}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-4 py-16 lg:px-8">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-3">
          {[
            { icon: UsersRound, title: "Onboarding no produto", text: "Guias por aba mostram ao gestor como configurar setores, funcionarios, tarefas e metas dentro da plataforma." },
            { icon: ShieldCheck, title: "Permissoes por papel", text: "Dono, gerente e funcionario veem fluxos diferentes, com dados administrativos protegidos." },
            { icon: Clock3, title: "Rotina recorrente", text: "Cadastre tarefas diarias, semanais ou mensais para manter processos importantes sempre visiveis." },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <div key={item.title} className="flex gap-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-slate-950 text-white">
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

      <section id="planos" className="bg-white px-4 py-16 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-3xl">
            <p className="text-sm font-semibold uppercase tracking-normal text-emerald-700">Planos</p>
            <h2 className="mt-3 text-3xl font-semibold text-slate-950 md:text-4xl">Planos para cada fase da operacao.</h2>
            <p className="mt-4 text-base leading-8 text-slate-600">
              O Basico organiza a entrada, o Gestao concentra o melhor equilibrio entre preco e valor, e o Completo libera relatorios executivos e controles avancados para operacoes maiores.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={`rounded-md border p-6 shadow-sm ${plan.highlight ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-950"}`}
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
                  <span className="text-4xl font-semibold">{plan.price}</span>
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
                  href="/signup"
                  className={
                    plan.highlight
                      ? buttonClassName("light") + " mt-7 w-full"
                      : buttonClassName("secondary") + " mt-7 w-full"
                  }
                >
                  Criar conta
                </Link>
              </article>
            ))}
          </div>

          <div className="mt-10 overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm">
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

      <section className="bg-white px-4 py-16 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-md border border-slate-200 bg-slate-950 p-8 text-white shadow-sm md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Comece a organizar sua equipe.</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">Crie uma conta, cadastre sua empresa e mantenha tarefas, metas e setores salvos em um unico lugar.</p>
          </div>
          <Link href="/signup" className={buttonClassName("light")}>
            Criar conta
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </section>
    </main>
  );
}
