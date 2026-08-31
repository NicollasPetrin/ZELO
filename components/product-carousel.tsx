"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { BarChart3, ChevronLeft, ChevronRight, LayoutDashboard, ListChecks } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Capturas reais do produto. Todas na mesma proporcao (1672x941) para que a
 * troca de aba nao mude a altura do bloco e empurre o resto da pagina.
 */
const shots = [
  {
    id: "painel",
    tab: "Painel",
    icon: LayoutDashboard,
    src: "/demo/painel.webp",
    alt: "Painel da Zelo com contadores de tarefas pendentes, atrasadas, concluidas, em andamento e urgentes, alem de proximos prazos, metas e desempenho por equipe.",
    title: "Painel do gestor",
    description:
      "Pendentes, atrasadas, concluidas e urgencias em uma unica tela, com proximos prazos, metas e desempenho por equipe e por setor.",
    highlights: ["Contadores por status", "Proximos prazos a vencer", "Desempenho por setor"],
  },
  {
    id: "tarefas",
    tab: "Tarefas",
    icon: ListChecks,
    src: "/demo/tarefas-equipe.webp",
    alt: "Tela de tarefas da equipe da Zelo com filtros de status, prioridade, setor e responsavel, e o formulario de nova tarefa aberto ao lado da lista.",
    title: "Tarefas da equipe",
    description:
      "Filtros por status, prioridade, setor e responsavel, com criacao de tarefa sem precisar sair da lista.",
    highlights: ["Filtros combinados", "Nova tarefa sem sair da lista", "Responsavel e prazo visiveis"],
  },
  {
    id: "relatorios",
    tab: "Relatorios",
    icon: BarChart3,
    src: "/demo/relatorios.webp",
    alt: "Tela de relatorios da Zelo com score de saude operacional, taxa de conclusao, distribuicao de status, desempenho por setor e metas em risco.",
    title: "Relatorios e indicadores",
    description:
      "Saude operacional, distribuicao de status, desempenho por setor e metas em risco para a leitura executiva.",
    highlights: ["Score de saude operacional", "Distribuicao de status", "Metas em risco"],
  },
];

export function ProductCarousel() {
  const [active, setActive] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const go = (index: number) => {
    const next = (index + shots.length) % shots.length;
    setActive(next);
    return next;
  };

  // Padrao de tablist: seta move a selecao e leva o foco junto, senao o
  // teclado seleciona uma aba e o foco fica preso na anterior.
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const offset = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;

    if (!offset) {
      return;
    }

    event.preventDefault();
    tabRefs.current[go(active + offset)]?.focus();
  };

  const setaClasse =
    "inline-flex h-11 w-11 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-white/10 hover:text-white lg:h-9 lg:w-9 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400";

  return (
    <div>
      {/* Abas e navegacao na mesma linha: antes as setas ficavam penduradas
          abaixo da imagem, longe do controle que elas operam. */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div
          role="tablist"
          aria-label="Telas da Zelo"
          className="inline-flex flex-wrap gap-1 rounded-lg border border-white/10 bg-white/[0.04] p-1"
        >
          {shots.map((shot, index) => {
            const Icon = shot.icon;
            const selected = index === active;

            return (
              <button
                key={shot.id}
                ref={(node) => {
                  tabRefs.current[index] = node;
                }}
                type="button"
                role="tab"
                id={`demo-tab-${shot.id}`}
                aria-selected={selected}
                aria-controls={`demo-panel-${shot.id}`}
                tabIndex={selected ? 0 : -1}
                onClick={() => setActive(index)}
                onKeyDown={onTabKeyDown}
                className={cn(
                  "inline-flex h-10 items-center gap-2 rounded-md px-3.5 text-sm font-medium transition-colors lg:h-9",
                  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400",
                  selected
                    ? "bg-white text-slate-950 shadow-sm"
                    : "text-slate-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <Icon
                  className={cn("h-4 w-4", selected ? "text-emerald-700" : "text-slate-400")}
                  aria-hidden="true"
                />
                {shot.tab}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <button type="button" onClick={() => go(active - 1)} className={setaClasse}>
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Tela anterior</span>
          </button>
          <span className="w-12 text-center text-sm tabular-nums text-slate-400" aria-hidden="true">
            {active + 1} / {shots.length}
          </span>
          <button type="button" onClick={() => go(active + 1)} className={setaClasse}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            <span className="sr-only">Proxima tela</span>
          </button>
        </div>
      </div>

      {shots.map((shot, index) => (
        <div
          key={shot.id}
          role="tabpanel"
          id={`demo-panel-${shot.id}`}
          aria-labelledby={`demo-tab-${shot.id}`}
          hidden={index !== active}
          className="mt-8"
        >
          {/* A chave inclui o indice ativo para o bloco remontar a cada troca e
              a animacao de entrada rodar de novo. */}
          <figure key={`${shot.id}-${active}`} className="demo-entra relative">
            {/* Brilho por tras da moldura: sem ele a captura clara fica colada
                no fundo escuro, como se estivesse recortada e solta. */}
            <div
              className="pointer-events-none absolute -inset-x-8 -top-6 bottom-1/3 rounded-full bg-emerald-500/10 blur-3xl"
              aria-hidden="true"
            />

            {/* Moldura de janela com borda em degrade: a borda chapada deixava
                a peca com cara de caixa, e o degrade sugere profundidade sem
                pesar. O padding de 1px e o que revela a borda. */}
            <div className="relative rounded-2xl bg-gradient-to-b from-white/20 via-white/10 to-transparent p-px shadow-[0_40px_90px_rgba(2,6,23,0.7)]">
            <div className="relative rounded-2xl bg-slate-950/80 p-1.5 backdrop-blur-sm">
              <div className="flex items-center gap-2 px-2.5 py-2">
                <span className="flex gap-1.5" aria-hidden="true">
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                  <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                </span>
                <span className="ml-1 truncate text-xs text-slate-400">
                  usezelogestao.com.br
                  <span className="text-slate-500">/{shot.id}</span>
                </span>
              </div>

              <div className="overflow-hidden rounded-xl border border-white/10 bg-slate-900">
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={1672}
                  height={941}
                  className="h-auto w-full"
                  sizes="(min-width: 1024px) 1216px, 100vw"
                />
              </div>
            </div>
            </div>

            {/* Duas colunas: o texto para de ser um paragrafo solto sob a imagem
                e passa a dividir espaco com o que a tela entrega. */}
            <figcaption className="relative mt-8 grid gap-8 border-t border-white/10 pt-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-400">{shot.tab}</p>
                <p className="mt-2 text-2xl font-semibold leading-tight text-white">{shot.title}</p>
                <p className="mt-3 text-base leading-7 text-slate-300">{shot.description}</p>
              </div>

              <ul className="grid gap-3 sm:grid-cols-3 lg:gap-4">
                {shot.highlights.map((item, posicao) => (
                  <li
                    key={item}
                    className="rounded-lg border border-white/10 bg-white/[0.03] p-4 transition-colors hover:border-emerald-400/30 hover:bg-white/[0.06]"
                  >
                    <span className="text-xs font-semibold tabular-nums text-emerald-400">
                      {String(posicao + 1).padStart(2, "0")}
                    </span>
                    <p className="mt-2 text-sm font-medium leading-6 text-slate-100">{item}</p>
                  </li>
                ))}
              </ul>
            </figcaption>
          </figure>
        </div>
      ))}
    </div>
  );
}
