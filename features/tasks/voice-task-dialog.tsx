"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Mic, Square, X } from "lucide-react";
import type { TaskPriority } from "@prisma/client";
import { buttonClassName } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/fields";
import { createTaskAction } from "@/features/tasks/actions";
import { cn } from "@/lib/cn";
import { priorityLabels } from "@/lib/labels";
import { taskPriorities } from "@/lib/validations";
import { parseVoiceTask, type ParsedVoiceTask, type VoiceDepartment, type VoicePerson, type VoiceSpanKind } from "@/lib/voice-task";

// O reconhecimento de voz do navegador ainda nao tem tipo no TypeScript.
type Reconhecimento = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

function criarReconhecimento(): Reconhecimento | null {
  if (typeof window === "undefined") {
    return null;
  }
  const janela = window as unknown as {
    SpeechRecognition?: new () => Reconhecimento;
    webkitSpeechRecognition?: new () => Reconhecimento;
  };
  const Classe = janela.SpeechRecognition ?? janela.webkitSpeechRecognition;
  return Classe ? new Classe() : null;
}

const EXEMPLOS = [
  "Bruno, conferir a validade dos iogurtes até sexta, é urgente",
  "Pede pra Ana fechar o caixa 2 hoje às 18h",
  "Repor o hortifruti amanhã cedo, sem pressa",
];

const corDoTrecho: Record<VoiceSpanKind, string> = {
  person: "bg-violet-100 text-violet-900",
  date: "bg-sky-100 text-sky-900",
  time: "bg-sky-100 text-sky-900",
  priority: "bg-rose-100 text-rose-900",
  department: "bg-emerald-100 text-emerald-900",
};

type Campo = "title" | "description" | "assigneeId" | "departmentId" | "dueDate" | "dueTime" | "priority";
type Valores = Record<Campo, string>;

const VAZIO: Valores = { title: "", description: "", assigneeId: "", departmentId: "", dueDate: "", dueTime: "17:00", priority: "MEDIUM" };

function valoresDa(leitura: ParsedVoiceTask, frase: string): Valores {
  return {
    title: leitura.title,
    description: frase.trim() ? `Ditado: "${frase.trim()}"` : "",
    assigneeId: leitura.assigneeId ?? "",
    departmentId: leitura.departmentId ?? "",
    dueDate: leitura.dueDate ?? "",
    dueTime: leitura.dueTime,
    priority: leitura.priority,
  };
}

function Origem({ tipo }: { tipo: "fala" | "padrao" | "setor" | "escolha" | "voce" }) {
  const rotulos = {
    fala: ["Entendido da fala", "bg-emerald-50 text-emerald-800"],
    padrao: ["Padrão", "bg-slate-100 text-slate-600"],
    setor: ["Setor de quem faz", "bg-slate-100 text-slate-600"],
    escolha: ["Escolha", "bg-amber-50 text-amber-800"],
    voce: ["Ajustado por você", "bg-sky-50 text-sky-800"],
  } as const;
  const [texto, classe] = rotulos[tipo];
  return <span className={cn("rounded px-1.5 py-0.5 text-[11px] font-medium", classe)}>{texto}</span>;
}

/**
 * Criar tarefa falando.
 *
 * A voz vira texto no proprio navegador (Chrome, Edge e Safari) e o texto vira
 * campos pelas regras de lib/voice-task — nada sai para servico pago. A tarefa
 * so e criada depois que a pessoa confere, e pela mesma acao do formulario.
 */
export function VoiceTaskDialog({
  meId,
  people,
  departments,
  variant = "primary",
}: {
  meId: string;
  people: VoicePerson[];
  departments: VoiceDepartment[];
  variant?: "primary" | "secondary";
}) {
  const router = useRouter();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const reconhecimentoRef = useRef<Reconhecimento | null>(null);
  const [frase, setFrase] = useState("");
  const [valores, setValores] = useState<Valores>(VAZIO);
  const [ajustados, setAjustados] = useState<Partial<Record<Campo, boolean>>>({});
  const [ouvindo, setOuvindo] = useState(false);
  const [semMicrofone, setSemMicrofone] = useState(false);
  const [erro, setErro] = useState<string>();
  const [criada, setCriada] = useState<{ id: string; title: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // "Agora" fixado quando a janela abre: amanha e hoje nao mudam enquanto a pessoa fala.
  const [agora, setAgora] = useState(() => new Date());
  const leitura = useMemo(
    () => parseVoiceTask(frase, { now: agora, meId, people, departments }),
    [frase, agora, meId, people, departments],
  );

  function aplicarFrase(nova: string) {
    setFrase(nova);
    const lida = parseVoiceTask(nova, { now: agora, meId, people, departments });
    const doTexto = valoresDa(lida, nova);
    // O que a pessoa ja ajustou a mao nao e sobrescrito pela releitura.
    setValores((atual) => {
      const proximo = { ...doTexto };
      for (const campo of Object.keys(ajustados) as Campo[]) {
        if (ajustados[campo]) {
          proximo[campo] = atual[campo];
        }
      }
      return proximo;
    });
  }

  function ajustar(campo: Campo, valor: string) {
    setValores((atual) => ({ ...atual, [campo]: valor }));
    setAjustados((atual) => ({ ...atual, [campo]: true }));
  }

  function abrir() {
    setAgora(new Date());
    setFrase("");
    setValores(VAZIO);
    setAjustados({});
    setErro(undefined);
    // So da para saber no navegador; a janela so abre nele, entao e aqui.
    setSemMicrofone(!criarReconhecimento());
    dialogRef.current?.showModal();
  }

  function fechar() {
    reconhecimentoRef.current?.stop();
    dialogRef.current?.close();
  }

  function ouvir() {
    if (ouvindo) {
      reconhecimentoRef.current?.stop();
      return;
    }
    const reconhecimento = criarReconhecimento();
    if (!reconhecimento) {
      setSemMicrofone(true);
      return;
    }
    reconhecimento.lang = "pt-BR";
    reconhecimento.interimResults = true;
    reconhecimento.continuous = false;
    reconhecimento.onresult = (event) => {
      let texto = "";
      for (let i = 0; i < event.results.length; i += 1) {
        texto += event.results[i][0].transcript;
      }
      aplicarFrase(texto);
    };
    reconhecimento.onerror = (event) => {
      setErro(
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "O navegador não deixou usar o microfone. Libere o acesso no cadeado da barra de endereço ou digite a frase."
          : event.error === "no-speech"
            ? "Não ouvimos nada. Toque no microfone e fale de novo."
            : "Não foi possível ouvir agora. Digite a frase ou tente de novo.",
      );
    };
    reconhecimento.onend = () => setOuvindo(false);
    reconhecimentoRef.current = reconhecimento;
    setErro(undefined);
    setOuvindo(true);
    reconhecimento.start();
  }

  function criar() {
    setErro(undefined);
    startTransition(async () => {
      const result = await createTaskAction({
        title: valores.title,
        description: valores.description,
        assigneeId: valores.assigneeId,
        departmentId: valores.departmentId,
        dueDate: valores.dueDate,
        dueTime: valores.dueTime,
        priority: valores.priority,
        status: "PENDING",
        recurrenceType: "NONE",
      });
      if (!result.ok) {
        setErro(result.error);
        return;
      }
      setCriada({ id: result.data.id, title: valores.title });
      fechar();
      router.refresh();
    });
  }

  const origem = (campo: Campo, padrao: "fala" | "padrao" | "setor" | "escolha"): "fala" | "padrao" | "setor" | "escolha" | "voce" =>
    ajustados[campo] ? "voce" : padrao;
  const pessoaPorId = new Map(people.map((p) => [p.id, p]));
  const opcoes = leitura.assigneeOptions;
  const faltando = !valores.title.trim() || !valores.assigneeId || !valores.departmentId || !valores.dueDate;

  // Frase com os trechos reconhecidos destacados.
  const trechos = [...leitura.spans].sort((a, b) => a.start - b.start);
  const destacada: Array<{ texto: string; kind?: VoiceSpanKind }> = [];
  let cursor = 0;
  for (const trecho of trechos) {
    if (trecho.start > cursor) {
      destacada.push({ texto: frase.slice(cursor, trecho.start) });
    }
    destacada.push({ texto: frase.slice(trecho.start, trecho.end), kind: trecho.kind });
    cursor = trecho.end;
  }
  if (cursor < frase.length) {
    destacada.push({ texto: frase.slice(cursor) });
  }

  return (
    <>
      <button type="button" className={buttonClassName(variant)} onClick={abrir}>
        <Mic className="h-4 w-4" aria-hidden="true" />
        Ditar tarefa
      </button>

      {criada ? (
        <div role="status" className="fixed inset-x-4 bottom-4 z-50 mx-auto flex max-w-md items-center gap-3 rounded-md bg-slate-950 px-4 py-3 text-sm text-white shadow-lg">
          <span className="min-w-0 flex-1 truncate">Tarefa criada: {criada.title}</span>
          <Link href={`/tasks/${criada.id}`} className="shrink-0 font-semibold text-emerald-300 hover:underline">
            Abrir
          </Link>
          <button type="button" onClick={() => setCriada(null)} aria-label="Fechar aviso" className="shrink-0 text-slate-400 hover:text-white">
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <dialog
        ref={dialogRef}
        aria-labelledby="ditar-titulo"
        onClose={() => reconhecimentoRef.current?.stop()}
        className="m-auto max-h-[92vh] w-[min(640px,calc(100vw-1.5rem))] overflow-y-auto rounded-lg border border-slate-200 bg-white p-0 shadow-xl backdrop:bg-slate-950/40"
      >
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="ditar-titulo" className="flex items-center gap-2 text-base font-semibold text-slate-950">
              <Mic className="h-4 w-4" aria-hidden="true" />
              Ditar tarefa
            </h2>
            <button type="button" onClick={fechar} className={buttonClassName("ghost", "sm")} aria-label="Fechar">
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {semMicrofone ? null : (
              <button
                type="button"
                onClick={ouvir}
                aria-pressed={ouvindo}
                aria-label={ouvindo ? "Parar de ouvir" : "Falar a tarefa"}
                className={cn(
                  "flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white transition-colors",
                  ouvindo ? "animate-pulse bg-rose-600" : "bg-slate-950 hover:bg-slate-800",
                )}
              >
                {ouvindo ? <Square className="h-5 w-5" aria-hidden="true" /> : <Mic className="h-6 w-6" aria-hidden="true" />}
              </button>
            )}
            <div className="min-w-0 text-sm">
              <p className="font-semibold text-slate-950">
                {ouvindo ? "Ouvindo… fale a tarefa, quem faz e o prazo." : semMicrofone ? "Digite a tarefa, quem faz e o prazo." : "Toque e fale a tarefa, quem faz e o prazo."}
              </p>
              <p className="text-xs leading-5 text-slate-500">
                {semMicrofone
                  ? "Este navegador não reconhece voz. No Chrome, no Edge e no Safari dá para falar."
                  : "A voz é reconhecida pelo próprio navegador. Você confere tudo antes de criar."}
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>O que foi dito</Label>
            <Textarea
              value={frase}
              rows={2}
              placeholder={`Ex.: ${EXEMPLOS[0]}`}
              onChange={(event) => aplicarFrase(event.target.value)}
            />
          </div>

          {frase.trim() ? (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase text-slate-500">Como a Zelo entendeu</p>
              <p className="rounded-md bg-slate-50 px-3 py-2 text-sm leading-7 text-slate-800">
                {destacada.map((parte, i) =>
                  parte.kind ? (
                    <mark key={i} className={cn("rounded px-0.5", corDoTrecho[parte.kind])}>
                      {parte.texto}
                    </mark>
                  ) : (
                    <span key={i}>{parte.texto}</span>
                  ),
                )}
              </p>
              <p className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
                <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-violet-200" />Pessoa</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-sky-200" />Prazo e horário</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-rose-200" />Prioridade</span>
                <span><span className="mr-1 inline-block h-2 w-2 rounded-sm bg-emerald-200" />Setor</span>
                <span>O resto vira o título</span>
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {EXEMPLOS.map((exemplo) => (
                <button
                  key={exemplo}
                  type="button"
                  onClick={() => aplicarFrase(exemplo)}
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-left text-xs text-slate-700 hover:bg-slate-100"
                >
                  {exemplo}
                </button>
              ))}
            </div>
          )}

          {frase.trim() ? (
            <div className="space-y-3 rounded-md border border-slate-200 p-3">
              <p className="text-sm font-semibold text-slate-950">Confira antes de criar</p>

              {leitura.notes.length > 0 ? (
                <ul className="space-y-1">
                  {leitura.notes.map((nota) => (
                    <li key={nota.text} className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-900">
                      {nota.text}
                      {nota.kind === "pick-person" ? (
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          {opcoes.map((id) => (
                            <button
                              key={id}
                              type="button"
                              onClick={() => {
                                ajustar("assigneeId", id);
                                const setor = pessoaPorId.get(id)?.departmentId;
                                if (setor && !ajustados.departmentId && departments.some((d) => d.id === setor)) {
                                  setValores((atual) => ({ ...atual, assigneeId: id, departmentId: setor }));
                                }
                              }}
                              className={cn(
                                "rounded border px-2 py-0.5 font-medium",
                                valores.assigneeId === id ? "border-slate-950 bg-slate-950 text-white" : "border-amber-300 bg-white text-amber-900",
                              )}
                            >
                              {pessoaPorId.get(id)?.name}
                            </button>
                          ))}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : null}

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <Label>Título</Label>
                  <Origem tipo={origem("title", "fala")} />
                </div>
                <Input value={valores.title} onChange={(event) => ajustar("title", event.target.value)} />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Quem faz</Label>
                    <Origem tipo={origem("assigneeId", leitura.assigneeId ? "fala" : "escolha")} />
                  </div>
                  <Select value={valores.assigneeId} onChange={(event) => ajustar("assigneeId", event.target.value)}>
                    <option value="">Escolha quem faz</option>
                    {people.map((pessoa) => (
                      <option key={pessoa.id} value={pessoa.id}>
                        {pessoa.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Setor</Label>
                    <Origem
                      tipo={origem(
                        "departmentId",
                        leitura.departmentSource === "spoken" ? "fala" : leitura.departmentSource === "assignee" ? "setor" : "escolha",
                      )}
                    />
                  </div>
                  <Select value={valores.departmentId} onChange={(event) => ajustar("departmentId", event.target.value)}>
                    <option value="">Escolha o setor</option>
                    {departments.map((setor) => (
                      <option key={setor.id} value={setor.id}>
                        {setor.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Prazo</Label>
                    <Origem
                      tipo={origem(
                        "dueDate",
                        leitura.dueDateSource === "spoken" ? "fala" : leitura.dueDateSource === "default" ? "padrao" : "escolha",
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-[minmax(0,1fr)_110px] gap-2">
                    <Input type="date" value={valores.dueDate} onChange={(event) => ajustar("dueDate", event.target.value)} />
                    <Input
                      type="time"
                      aria-label="Horário do prazo"
                      value={valores.dueTime}
                      onChange={(event) => ajustar("dueTime", event.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Prioridade</Label>
                    <Origem tipo={origem("priority", leitura.prioritySource === "spoken" ? "fala" : "padrao")} />
                  </div>
                  <Select value={valores.priority} onChange={(event) => ajustar("priority", event.target.value as TaskPriority)}>
                    {taskPriorities.map((prioridade) => (
                      <option key={prioridade} value={prioridade}>
                        {priorityLabels[prioridade]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Descrição</Label>
                <Textarea value={valores.description} rows={2} onChange={(event) => ajustar("description", event.target.value)} />
              </div>
            </div>
          ) : null}

          {erro ? (
            <p role="alert" className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-800">
              {erro}
            </p>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" onClick={fechar} className={buttonClassName("secondary")}>
              Cancelar
            </button>
            <button type="button" onClick={criar} disabled={isPending || faltando} className={buttonClassName("primary")}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
              {isPending ? "Criando…" : "Criar tarefa"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
