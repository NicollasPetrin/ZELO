"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, Plus } from "lucide-react";
import { buttonClassName } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { statusLabels } from "@/lib/labels";
import { liveStoreTickAction } from "@/features/simulation/actions";
import type { AcaoSimulada, EventoDaLoja, Loja, PessoaDaLoja } from "@/features/simulation/engine";
import { CH, CW, SALAS, criarCena, desenharAvatar, lookDe, posicaoDoRotulo, type Cena, type Marcador } from "@/features/simulation/iso-scene";

/** De quanto em quanto tempo a loja anda e a tela se atualiza. */
const BATIDA_MS = 8000;

const VERBO: Record<EventoDaLoja["tipo"], string> = {
  concluiu: "concluiu",
  comecou: "começou",
  criou: "criou",
  renovou: "renovou a rotina",
  comentou: "comentou em",
  reabriu: "reabriu",
  atualizou: "atualizou",
};

const COR_VERBO: Record<EventoDaLoja["tipo"], string> = {
  concluiu: "text-emerald-700",
  comecou: "text-sky-700",
  criou: "text-violet-700",
  renovou: "text-slate-500",
  comentou: "text-amber-700",
  reabriu: "text-rose-700",
  atualizou: "text-slate-600",
};

function hora(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

function prazo(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).format(new Date(iso));
}

function primeiroNome(nome: string) {
  return nome.split(" ")[0] ?? nome;
}

function Retrato({ chave, indice, grande = false }: { chave: string; indice: number; grande?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current?.getContext("2d");
    if (!c) return;
    c.clearRect(0, 0, 20, 34);
    desenharAvatar(c, lookDe(chave, indice), 10, 33, 1, 1);
  }, [chave, indice]);
  return (
    <canvas
      ref={ref}
      width={20}
      height={34}
      aria-hidden="true"
      className={cn("shrink-0 border border-slate-300 bg-amber-50 [image-rendering:pixelated]", grande ? "h-[102px] w-[60px]" : "h-[51px] w-[30px]")}
    />
  );
}

function Selos({ p }: { p: PessoaDaLoja }) {
  return (
    <span className="flex flex-wrap gap-1">
      {p.fazendo ? <span className="rounded bg-sky-700 px-1.5 text-[10px] font-semibold text-white">fazendo</span> : null}
      {p.atrasadas ? <span className="rounded bg-rose-700 px-1.5 text-[10px] font-semibold text-white">{p.atrasadas} atrasada{p.atrasadas > 1 ? "s" : ""}</span> : null}
      {p.hoje ? <span className="rounded bg-amber-600 px-1.5 text-[10px] font-semibold text-white">{p.hoje} hoje</span> : null}
      {p.feitasHoje ? <span className="rounded bg-emerald-700 px-1.5 text-[10px] font-semibold text-white">{p.feitasHoje} feita{p.feitasHoje > 1 ? "s" : ""}</span> : null}
      {!p.abertas && !p.feitasHoje ? <span className="rounded border border-slate-300 px-1.5 text-[10px] text-slate-500">sem tarefas</span> : null}
    </span>
  );
}

function Ficha({ p, indice, onVoltar }: { p: PessoaDaLoja; indice: number; onVoltar: () => void }) {
  const abertas = p.tarefas.filter((t) => t.status !== "COMPLETED");
  const feitas = p.tarefas.filter((t) => t.status === "COMPLETED");
  const simulada = p.papel !== "OWNER";

  return (
    <div className="space-y-4">
      <button type="button" onClick={onVoltar} className="text-xs font-medium text-slate-600 underline underline-offset-2 hover:text-slate-950">
        ← Toda a equipe
      </button>
      <div className="flex items-start gap-3">
        <Retrato chave={p.chave} indice={indice} grande />
        <div className="min-w-0 space-y-1">
          <h2 className="text-lg font-semibold text-slate-950">{p.nome}</h2>
          <p className="text-sm text-slate-600">
            {[p.cargo, p.setor].filter(Boolean).join(" · ")}
          </p>
          <Selos p={p} />
          {p.fazendo ? <p className="text-xs text-sky-800">Diz que está fazendo: {p.fazendo}</p> : null}
        </div>
      </div>

      {simulada ? (
        <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          Para cobrar, abra a tarefa e escreva um comentário. {primeiroNome(p.nome)} responde do seu jeito e volta a trabalhar nela.
        </p>
      ) : (
        <p className="rounded-md border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
          O dono é você: ninguém faz estas tarefas no seu lugar.
        </p>
      )}

      <section className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Abertas ({abertas.length})</h3>
        {abertas.length ? (
          <ul className="space-y-1.5">
            {abertas.map((t) => (
              <li key={t.id}>
                <Link
                  href={`/tasks/${t.id}`}
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-slate-50",
                    t.atrasada ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-slate-900">{t.titulo}</span>
                    <span className={cn("text-xs", t.atrasada ? "font-semibold text-rose-700" : "text-slate-500")}>
                      {t.atrasada ? "Atrasada · " : ""}
                      {prazo(t.prazo)}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-600">{statusLabels[t.status]}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nada em aberto.</p>
        )}
      </section>

      {feitas.length ? (
        <section className="space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">Concluídas hoje ({feitas.length})</h3>
          <ul className="space-y-1">
            {feitas.map((t) => (
              <li key={t.id}>
                <Link href={`/tasks/${t.id}`} className="block truncate rounded px-2 py-1 text-sm text-emerald-800 hover:bg-emerald-50">
                  ✓ {t.titulo}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

export function LiveStore({ inicial }: { inicial: Loja }) {
  const [loja, setLoja] = useState(inicial);
  const [rodando, setRodando] = useState(true);
  const [aba, setAba] = useState<"equipe" | "agora">("agora");
  const [selId, setSelId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const camadaRef = useRef<HTMLDivElement>(null);
  const cenaRef = useRef<Cena | null>(null);
  const ocupado = useRef(false);

  const indices = useMemo(() => new Map(inicial.pessoas.map((p, i) => [p.id, i])), [inicial.pessoas]);

  // A cena nasce uma vez com quem estava na loja ao abrir a pagina.
  useEffect(() => {
    if (!canvasRef.current || !camadaRef.current) return;
    const cena = criarCena(
      canvasRef.current,
      camadaRef.current,
      inicial.pessoas.map((p) => ({ id: p.id, chave: p.chave, nome: p.nome })),
      (id) => {
        setSelId(id);
        setAba("equipe");
      },
    );
    cenaRef.current = cena;
    return () => cena.parar();
  }, [inicial.pessoas]);

  useEffect(() => {
    const marcadores: Record<string, Marcador> = {};
    for (const p of loja.pessoas) {
      marcadores[p.id] = { atrasadas: p.atrasadas, hoje: p.hoje, fazendo: Boolean(p.fazendo), feitas: p.feitasHoje };
    }
    cenaRef.current?.marcar(marcadores);
  }, [loja]);

  useEffect(() => {
    cenaRef.current?.selecionar(selId);
  }, [selId]);

  const mostrarAcoes = useCallback((acoes: readonly AcaoSimulada[]) => {
    for (const a of acoes) {
      if (a.tipo === "concluir") cenaRef.current?.falar(a.pessoaId, a.comentario ? `✓ ${a.comentario}` : `✓ Concluí: ${a.tarefa}`, "feito");
      else if (a.tipo === "comecar") cenaRef.current?.falar(a.pessoaId, a.comentario ?? `Começando: ${a.tarefa}`, "fazendo");
      else cenaRef.current?.falar(a.pessoaId, a.comentario ?? "", "fala");
    }
  }, []);

  const bater = useCallback(
    async (rodar: boolean) => {
      if (ocupado.current) return;
      ocupado.current = true;
      try {
        const r = await liveStoreTickAction(rodar);
        if (r.ok) {
          setErro(null);
          setLoja(r.data.loja);
          mostrarAcoes(r.data.acoes);
        } else {
          setErro(r.error);
        }
      } catch {
        setErro("Sem conexão com a Zelo. Tentando de novo…");
      } finally {
        ocupado.current = false;
      }
    },
    [mostrarAcoes],
  );

  useEffect(() => {
    const id = window.setInterval(() => void bater(rodando), BATIDA_MS);
    return () => window.clearInterval(id);
  }, [bater, rodando]);

  const totais = loja.pessoas.reduce(
    (s, p) => ({ atrasadas: s.atrasadas + p.atrasadas, fazendo: s.fazendo + (p.fazendo ? 1 : 0), feitas: s.feitas + p.feitasHoje, hoje: s.hoje + p.hoje }),
    { atrasadas: 0, fazendo: 0, feitas: 0, hoje: 0 },
  );
  const selecionada = loja.pessoas.find((p) => p.id === selId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-stretch gap-3">
        <div className="flex items-center gap-1 rounded-lg border-2 border-slate-950 bg-slate-900 px-2 py-2 text-white shadow-[3px_3px_0_rgba(0,0,0,.35)]">
          {[
            { n: totais.atrasadas, rot: "atrasadas", cor: "text-rose-300" },
            { n: totais.hoje, rot: "vencem hoje", cor: "text-amber-300" },
            { n: totais.fazendo, rot: "fazendo agora", cor: "text-sky-300" },
            { n: totais.feitas, rot: "feitas hoje", cor: "text-emerald-300" },
          ].map((x) => (
            <div key={x.rot} className="flex min-w-[78px] flex-col items-center px-2">
              <span className={cn("font-mono text-2xl font-bold tabular-nums leading-none", x.cor)}>{x.n}</span>
              <span className="mt-1 text-[10px] uppercase tracking-wide text-slate-300">{x.rot}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setRodando((v) => !v)}
            className={buttonClassName(rodando ? "secondary" : "primary")}
            aria-pressed={rodando}
          >
            {rodando ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            {rodando ? "Pausar expediente" : "Retomar expediente"}
          </button>
          <Link href="/team-tasks#nova-tarefa" className={buttonClassName("primary")}>
            <Plus className="h-4 w-4" />
            Nova tarefa
          </Link>
          <span className="text-xs text-slate-500" role="status" aria-live="polite">
            {erro ?? (rodando ? `Expediente rodando · atualizado às ${hora(loja.agora)}` : "Expediente pausado: ninguém mexe nas tarefas.")}
          </span>
        </div>
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <section className="overflow-hidden rounded-lg border-[3px] border-slate-950 bg-[#0f1520] shadow-[5px_5px_0_rgba(0,0,0,.3)]" aria-label="Loja em vista isométrica">
          <div className="flex items-center justify-between gap-2 border-b-[3px] border-slate-950 bg-emerald-800 px-3 py-1.5 text-sm font-semibold text-amber-300">
            <span>Mercadinho · vista da loja</span>
            <span className="text-xs font-normal text-emerald-100">Clique num funcionário para ver as tarefas dele</span>
          </div>
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={CW}
              height={CH}
              className="block h-auto w-full [image-rendering:pixelated]"
              role="img"
              aria-label="Planta isométrica da loja com a equipe trabalhando. A lista ao lado mostra as mesmas informações."
            />
            <div ref={camadaRef} className="pointer-events-none absolute inset-0" aria-hidden="true">
              {SALAS.map((s) => {
                const pos = posicaoDoRotulo(s);
                return (
                  <span
                    key={s.id}
                    className="absolute hidden -translate-x-1/2 -translate-y-1/2 whitespace-nowrap bg-slate-950/65 px-1.5 text-[10px] text-white sm:block"
                    style={{ left: `${pos.left}%`, top: `${pos.top}%` }}
                  >
                    {s.nome}
                  </span>
                );
              })}
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 border-t-[3px] border-slate-950 bg-slate-900 px-3 py-2 text-xs text-slate-300">
            <span><i className="mr-1.5 inline-block h-2.5 w-3 border border-slate-950 bg-[#2c6fb7] align-middle" />azul: diz que está fazendo</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-3 border border-slate-950 bg-[#c23e2c] align-middle" />vermelho: atrasadas</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-3 border border-slate-950 bg-[#e0a019] align-middle" />amarelo: vencem hoje</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-3 border border-slate-950 bg-[#3a9a58] align-middle" />verde: fez tudo do dia</span>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white" aria-label="Equipe e acontecimentos">
          <div className="flex gap-1 border-b border-slate-200 p-2" role="tablist">
            {(
              [
                ["agora", "Acontecendo agora"],
                ["equipe", "Equipe"],
              ] as const
            ).map(([id, rot]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={aba === id}
                onClick={() => setAba(id)}
                className={cn("rounded-md px-3 py-1.5 text-sm font-medium", aba === id ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100")}
              >
                {rot}
              </button>
            ))}
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-3" role="tabpanel">
            {aba === "agora" ? (
              loja.eventos.length ? (
                <ol className="divide-y divide-dashed divide-slate-200">
                  {loja.eventos.map((e) => (
                    <li key={e.id} className="grid grid-cols-[62px_minmax(0,1fr)] gap-2 py-2 text-sm">
                      <span className="pt-0.5 font-mono text-[11px] text-slate-500">{hora(e.quando)}</span>
                      <span className="min-w-0">
                        <button
                          type="button"
                          className="font-semibold text-slate-900 hover:underline"
                          onClick={() => {
                            if (e.pessoaId) {
                              setSelId(e.pessoaId);
                              setAba("equipe");
                            }
                          }}
                        >
                          {primeiroNome(e.quem)}
                        </button>{" "}
                        <span className={COR_VERBO[e.tipo]}>{VERBO[e.tipo]}</span>{" "}
                        {e.taskId ? (
                          <Link href={`/tasks/${e.taskId}`} className="text-slate-700 underline decoration-slate-300 underline-offset-2 hover:text-slate-950">
                            {e.tarefa}
                          </Link>
                        ) : (
                          <span className="text-slate-700">{e.tarefa}</span>
                        )}
                        {e.texto ? <span className="mt-1 block rounded bg-amber-50 px-2 py-1 text-xs italic text-slate-700">“{e.texto}”</span> : null}
                      </span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-slate-500">Nada aconteceu ainda. Crie uma tarefa para alguém e veja a reação.</p>
              )
            ) : selecionada ? (
              <Ficha p={selecionada} indice={indices.get(selecionada.id) ?? 0} onVoltar={() => setSelId(null)} />
            ) : (
              <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                {loja.pessoas.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => setSelId(p.id)}
                      className="flex w-full items-center gap-2.5 rounded-md border border-slate-200 bg-white px-2.5 py-2 text-left hover:bg-slate-50"
                    >
                      <Retrato chave={p.chave} indice={indices.get(p.id) ?? 0} />
                      <span className="min-w-0 space-y-1">
                        <span className="block truncate text-sm font-semibold text-slate-950">{p.nome}</span>
                        <span className="block truncate text-xs text-slate-500">{p.cargo ?? p.setor}</span>
                        <Selos p={p} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
