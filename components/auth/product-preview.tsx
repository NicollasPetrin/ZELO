import { CheckSquare, Crosshair, Home, Inbox, LayoutGrid, Mic } from "lucide-react";

/**
 * Miniatura do produto para o painel das telas de entrar e de criar conta.
 * E desenho, nao captura: dados ficticios, sem nenhuma informacao de cliente,
 * e acompanha o visual do app sem precisar regerar imagem a cada mudanca.
 */
export function ProductPreview() {
  const espacos = [
    { nome: "Estoque", cor: "bg-sky-600", atrasadas: 2 },
    { nome: "Caixa", cor: "bg-violet-600", atrasadas: 0 },
    { nome: "Açougue", cor: "bg-rose-600", atrasadas: 1 },
    { nome: "Hortifruti", cor: "bg-emerald-600", atrasadas: 0 },
  ];
  const grupos = [
    { titulo: "Atrasadas", n: 2, destaque: true },
    { titulo: "Hoje", n: 3, destaque: false },
    { titulo: "Próximos 7 dias", n: 5, destaque: false },
  ];

  return (
    <div className="relative" aria-hidden="true">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-emerald-900/5">
        <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2">
          <span className="h-2 w-2 rounded-full bg-slate-200" />
          <span className="h-2 w-2 rounded-full bg-slate-200" />
          <span className="h-2 w-2 rounded-full bg-slate-200" />
        </div>
        <div className="grid grid-cols-[160px_minmax(0,1fr)] whitespace-nowrap text-[11px]">
          <div className="space-y-0.5 border-r border-slate-100 p-2.5">
            <div className="mb-2 flex items-center gap-1.5">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-emerald-700 text-[9px] font-semibold text-white">MB</span>
              <span className="truncate font-semibold text-slate-900">Mercado Bom Preço</span>
            </div>
            <p className="flex items-center gap-1.5 rounded bg-slate-950 px-1.5 py-1 font-medium text-white">
              <Home className="h-3 w-3" /> Início
            </p>
            <p className="flex items-center gap-1.5 px-1.5 py-1 text-slate-600">
              <Inbox className="h-3 w-3" /> Caixa de entrada
              <span className="ml-auto rounded-full bg-emerald-600 px-1 text-[9px] font-semibold text-white">3</span>
            </p>
            <p className="flex items-center gap-1.5 px-1.5 py-1 text-slate-600">
              <CheckSquare className="h-3 w-3" /> Minhas tarefas
            </p>
            <p className="px-1.5 pb-0.5 pt-2 text-[9px] font-semibold uppercase tracking-wide text-slate-400">Espaços</p>
            <p className="flex items-center gap-1.5 px-1.5 py-1 text-slate-600">
              <LayoutGrid className="h-3 w-3" /> Todas as tarefas
            </p>
            {espacos.map((espaco) => (
              <p key={espaco.nome} className="flex items-center gap-1.5 px-1.5 py-1 text-slate-600">
                <span className={`flex h-3 w-3 items-center justify-center rounded-sm text-[7px] font-bold text-white ${espaco.cor}`}>
                  {espaco.nome[0]}
                </span>
                {espaco.nome}
                {espaco.atrasadas ? (
                  <span className="ml-auto rounded-full bg-rose-100 px-1 text-[9px] font-semibold text-rose-700">{espaco.atrasadas}</span>
                ) : null}
              </p>
            ))}
          </div>

          <div className="min-w-0 space-y-2 whitespace-normal bg-slate-50/60 p-3">
            <div>
              <p className="text-[13px] font-semibold text-slate-950">Bom dia, Ana</p>
              <p className="text-slate-500">Quinta-feira, 16 de outubro · 10 tarefas suas em aberto</p>
            </div>
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-2">
              <p className="flex items-center gap-1 text-[9px] font-semibold uppercase text-emerald-800">
                <Crosshair className="h-3 w-3" /> Foco do dia
              </p>
              <p className="mt-1 font-semibold text-slate-950">Conferir a validade dos iogurtes</p>
              <p className="mt-0.5 flex items-center gap-1.5">
                <span className="font-semibold text-rose-700">Venceu ontem</span>
                <span className="rounded bg-rose-100 px-1 text-[9px] font-medium text-rose-800">Urgente</span>
                <span className="text-slate-500">Estoque</span>
              </p>
            </div>
            {grupos.map((grupo) => (
              <div key={grupo.titulo} className="flex items-center gap-2 rounded-md border border-slate-200 bg-white px-2 py-1.5">
                <span className={`font-semibold ${grupo.destaque ? "text-rose-700" : "text-slate-900"}`}>{grupo.titulo}</span>
                <span className="rounded-full bg-slate-100 px-1.5 text-[9px] text-slate-600">{grupo.n}</span>
                <span className="ml-auto h-1.5 w-16 rounded-full bg-slate-100" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="absolute -bottom-6 -right-4 hidden w-60 rounded-lg border border-slate-200 bg-white p-3 text-[11px] shadow-lg xl:block">
        <p className="flex items-center gap-1.5 font-semibold text-slate-950">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-white">
            <Mic className="h-3 w-3" />
          </span>
          Ditar tarefa
        </p>
        <p className="mt-2 leading-5 text-slate-700">
          <mark className="rounded bg-violet-100 px-0.5 text-violet-900">Bruno,</mark> repor o leite{" "}
          <mark className="rounded bg-sky-100 px-0.5 text-sky-900">amanhã às 9h</mark>
        </p>
      </div>
    </div>
  );
}
