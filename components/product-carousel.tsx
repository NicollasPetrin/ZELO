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

  return (
    <div>
      <div
        role="tablist"
        aria-label="Telas da Zelo"
        className="flex flex-wrap gap-2"
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
                "inline-flex h-11 items-center gap-2 rounded-md px-3 text-sm font-medium transition-colors lg:h-9",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                selected
                  ? "bg-white text-slate-950"
                  : "border border-white/15 text-slate-300 hover:bg-white/10 hover:text-white",
              )}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              {shot.tab}
            </button>
          );
        })}
      </div>

      {shots.map((shot, index) => (
        <div
          key={shot.id}
          role="tabpanel"
          id={`demo-panel-${shot.id}`}
          aria-labelledby={`demo-tab-${shot.id}`}
          hidden={index !== active}
          className="mt-6"
        >
          <div className="overflow-hidden rounded-md border border-white/10 shadow-[0_24px_60px_rgba(2,6,23,0.55)]">
            <Image
              src={shot.src}
              alt={shot.alt}
              width={1672}
              height={941}
              className="h-auto w-full"
              sizes="(min-width: 1024px) 1216px, 100vw"
            />
          </div>
          <p className="mt-4 font-semibold text-white">{shot.title}</p>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-400">{shot.description}</p>
        </div>
      ))}

      <div className="mt-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => go(active - 1)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border lg:h-9 lg:w-9 border-white/15 text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Tela anterior</span>
        </button>
        <button
          type="button"
          onClick={() => go(active + 1)}
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border lg:h-9 lg:w-9 border-white/15 text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Proxima tela</span>
        </button>
        <span className="text-sm text-slate-400" aria-hidden="true">
          {active + 1} / {shots.length}
        </span>
      </div>
    </div>
  );
}
