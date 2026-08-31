"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { BarChart3, Check, ChevronLeft, ChevronRight, LayoutDashboard, ListChecks } from "lucide-react";
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

      <div className="mt-8 grid items-center gap-8 lg:grid-cols-2 lg:gap-12">
        {/* Texto: so o da tela ativa aparece, com entrada suave. Fica fora do
            trilho porque deslizar texto junto com a imagem embaralha a leitura. */}
        <div key={`texto-${active}`} className="demo-entra">
          <p className="text-sm font-semibold uppercase tracking-[0.08em] text-emerald-400">{shots[active].tab}</p>
          <p className="mt-2 text-2xl font-semibold leading-tight text-white">{shots[active].title}</p>
          <p className="mt-3 text-base leading-7 text-slate-300">{shots[active].description}</p>

          <ul className="mt-5 space-y-2.5">
            {shots[active].highlights.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm leading-6 text-slate-200">
                <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-400" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* min-w-0 e obrigatorio: item de grid nao encolhe abaixo da largura
            natural do conteudo, e o trilho com tres telas lado a lado media o
            triplo da tela. Sem isto a captura aparecia cortada no celular. */}
        <div className="relative min-w-0">
          {/* Brilho por tras da moldura: sem ele a captura clara fica colada no
              fundo escuro, como se estivesse recortada e solta. */}
          <div
            className="pointer-events-none absolute -inset-6 rounded-full bg-emerald-500/10 blur-3xl"
            aria-hidden="true"
          />

          {/* Trilho: as telas ficam lado a lado e o conjunto desliza. A troca
              deixa de ser um corte seco e passa a mostrar de onde veio. */}
          <div className="relative overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-500 ease-out motion-reduce:transition-none"
              style={{ transform: `translateX(-${active * 100}%)` }}
            >
              {shots.map((shot, index) => (
                <figure
                  key={shot.id}
                  role="tabpanel"
                  id={`demo-panel-${shot.id}`}
                  aria-labelledby={`demo-tab-${shot.id}`}
                  // As telas fora de foco continuam no trilho para poderem
                  // deslizar, mas saem da leitura e da navegacao por teclado.
                  aria-hidden={index !== active}
                  inert={index !== active}
                  className="w-full shrink-0"
                >
                  <div className="rounded-2xl bg-gradient-to-b from-white/20 via-white/10 to-transparent p-px shadow-[0_30px_70px_rgba(2,6,23,0.65)]">
                    <div className="rounded-2xl bg-slate-950/80 p-1.5 backdrop-blur-sm">
                      <div className="flex items-center gap-2 px-2.5 py-1.5">
                        <span className="flex gap-1.5" aria-hidden="true">
                          <span className="h-2 w-2 rounded-full bg-white/20" />
                          <span className="h-2 w-2 rounded-full bg-white/20" />
                          <span className="h-2 w-2 rounded-full bg-white/20" />
                        </span>
                        <span className="ml-1 truncate text-[11px] text-slate-400">
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
                          sizes="(min-width: 1024px) 560px, 100vw"
                        />
                      </div>
                    </div>
                  </div>
                  <figcaption className="sr-only">{shot.title}</figcaption>
                </figure>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
