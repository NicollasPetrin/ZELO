import type { TaskPriority } from "@prisma/client";
import { brasiliaDay, DEFAULT_DUE_TIME, dueDateAt } from "@/lib/due-date";

/**
 * Interpretador da tarefa ditada.
 *
 * So regras, sem IA: nao custa nada por tarefa e responde na hora, no proprio
 * navegador. Procura na frase quem faz, o prazo, o horario, a prioridade e o
 * setor; o que sobra vira o titulo. Quem dita confere tudo antes de criar, entao
 * a regra pode errar para o lado de deixar em branco, nunca de inventar.
 */

export type VoicePerson = { id: string; name: string; departmentId: string | null };
export type VoiceDepartment = { id: string; name: string };

export type VoiceContext = {
  now: Date;
  meId: string;
  people: VoicePerson[];
  departments: VoiceDepartment[];
};

export type VoiceSpanKind = "command" | "person" | "date" | "time" | "priority" | "department";

export type VoiceSpan = { start: number; end: number; kind: VoiceSpanKind; remove: boolean };

export type VoiceNote = { kind: "pick-person" | "info"; text: string };

export type ParsedVoiceTask = {
  title: string;
  assigneeId: string | null;
  /** Quando o nome dito bate com mais de uma pessoa: quem pode ser. */
  assigneeOptions: string[];
  dueDate: string | null;
  dueDateSource: "spoken" | "default" | "missing";
  dueTime: string;
  dueTimeSource: "spoken" | "default";
  priority: TaskPriority;
  prioritySource: "spoken" | "default";
  departmentId: string | null;
  departmentSource: "spoken" | "assignee" | "missing";
  notes: VoiceNote[];
  /** Trechos reconhecidos, nas posicoes da frase original, para destacar na tela. */
  spans: VoiceSpan[];
};

export function fold(text: string) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Mesma frase sem acento e em minusculas, com cada letra na mesma posicao do
 * original. As regras procuram no texto dobrado e recortam o titulo do texto
 * que a pessoa falou, com os acentos dela.
 */
function foldAligned(original: string) {
  let out = "";

  for (const char of original.split("")) {
    const dobrado = fold(char);
    out += dobrado.length === 1 ? dobrado : dobrado.charAt(0) || " ";
  }

  return out;
}

/**
 * Chave para comparar nomes pelo som, e nao pela grafia.
 *
 * O reconhecimento de voz escreve o nome do jeito mais comum ("Nicolas"),
 * nao do jeito que esta no cadastro ("Nicollas"). Letra dobrada, y/i, k/c,
 * w/v, th/t, ph/f, h mudo e z/s no fim viram a mesma coisa dos dois lados.
 */
export function nameKey(word: string) {
  return fold(word)
    .replace(/ph/g, "f")
    .replace(/th/g, "t")
    .replace(/([^cln])h/g, "$1")
    .replace(/^h/, "")
    .replace(/y/g, "i")
    .replace(/w/g, "v")
    .replace(/k/g, "c")
    .replace(/z$/, "s")
    .replace(/(.)\1+/g, "$1");
}

function escapeRegex(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const NUMEROS: Record<string, number> = {
  um: 1, uma: 1, dois: 2, duas: 2, tres: 3, quatro: 4, cinco: 5, seis: 6, sete: 7, oito: 8, nove: 9, dez: 10, quinze: 15, trinta: 30,
};
const DIAS_DA_SEMANA: Record<string, number> = { domingo: 0, segunda: 1, terca: 2, quarta: 3, quinta: 4, sexta: 5, sabado: 6 };
const MESES: Record<string, number> = {
  janeiro: 0, fevereiro: 1, marco: 2, abril: 3, maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8, outubro: 9, novembro: 10, dezembro: 11,
};

// Palavras que costumam vir antes ou depois do prazo e da pessoa. Saem do
// titulo junto com eles: "ate sexta" some inteiro, e nao so "sexta".
const ANTES_DO_PRAZO = /(?:\b(?:ate|para|pra|em|no|na|nesta|nessa|essa|esta|de|do|da)\s+)?(?:\b(?:o|a)\s+)?$/;
const ANTES_DA_PESSOA =
  /(?:\b(?:pede|peca|pedir|manda|mandar|lembra|lembrar|avisa|avisar|fala|falar|diz|diga|chama)\s+)?(?:\b(?:pro|pra|para|ao|a|o)\s+)?(?:\b(?:o|a)\s+)?$/;
const DEPOIS_DA_PESSOA = /^\s*[,:-]?\s*(?:\b(?:de|que|para|pra)\b)?/;
// O pedido em si ("adicionar tarefa", "cria uma tarefa pro...") nao faz parte
// do que precisa ser feito: sai do titulo.
const COMANDO =
  /^\s*(?:(?:ok|zelo|por favor)[\s,]+)*(?:(?:adiciona(?:r)?|cria(?:r)?|coloca(?:r)?|cadastra(?:r)?|registra(?:r)?|anota(?:r)?|lanca(?:r)?|abre|abrir|inclui(?:r)?|bota(?:r)?)\s+(?:(?:uma|um|a|essa|esta)\s+)?(?:nova\s+)?tarefa|(?:uma\s+)?nova\s+tarefa|tarefa)\b\s*[:,.-]?/;
const INICIO_SOBRANDO =
  /^(?:lembrar de|lembrar|por favor|tem que|tem de|precisa|preciso|pra|para|que|de|e|ele|ela|vai|pode|favor|ok|entao|tipo|a|o)\s+/;
const FIM_SOBRANDO = /\s+(?:por favor|e|eh|ate|para|pra|com|de|do|da|no|na|as|a|o|ok|que)$/;

/** Limpa o que sobrou da frase: espacos, pontuacao solta e palavras de ligacao nas pontas. */
export function cleanTitle(text: string) {
  let s = text.replace(/\s+/g, " ").replace(/\s+([,.;:!?])/g, "$1").replace(/([,;])(?:\s*[,;])+/g, "$1").trim();

  for (let volta = 0; volta < 10; volta += 1) {
    const antes = s;
    s = s.replace(/^[\s,.;:!?\-–]+/, "").replace(/[\s,.;:!?\-–]+$/, "");
    const inicio = INICIO_SOBRANDO.exec(foldAligned(s));
    if (inicio && inicio[0].length < s.length) {
      s = s.slice(inicio[0].length);
    }
    const fim = FIM_SOBRANDO.exec(foldAligned(s));
    if (fim) {
      s = s.slice(0, s.length - fim[0].length);
    }
    if (s === antes) {
      break;
    }
  }

  s = s.replace(/\s+/g, " ").trim();

  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

// Datas como dias de calendario, sem hora: um Date em UTC a meia-noite. Assim a
// conta de "daqui a 3 dias" nao depende do fuso de quem roda o codigo.
type Dia = Date;

function diaDe(texto: string): Dia {
  const [ano, mes, dia] = texto.split("-").map(Number);
  return new Date(Date.UTC(ano, mes - 1, dia));
}

function texto(dia: Dia) {
  return dia.toISOString().slice(0, 10);
}

function criarDia(ano: number, mes: number, dia: number): Dia | null {
  const data = new Date(Date.UTC(ano, mes, dia));
  return data.getUTCDate() === dia ? data : null;
}

type Regra<T> = [RegExp, (match: RegExpExecArray) => T | null];

export function parseVoiceTask(phrase: string, ctx: VoiceContext): ParsedVoiceTask {
  const original = String(phrase ?? "").normalize("NFC");
  const norm = foldAligned(original);
  const spans: VoiceSpan[] = [];
  const hoje = diaDe(brasiliaDay(ctx.now));
  const somar = (dias: number) => new Date(hoje.getTime() + dias * 86_400_000);

  const livre = (inicio: number, fim: number) => spans.every((s) => inicio >= s.end || fim <= s.start);
  const marcar = (inicio: number, fim: number, kind: VoiceSpanKind, remove = true) => {
    if (inicio >= fim || !livre(inicio, fim)) {
      return false;
    }
    spans.push({ start: inicio, end: fim, kind, remove });
    return true;
  };
  const voltarAte = (inicio: number, regra: RegExp) => {
    const m = norm.slice(0, inicio).match(regra);
    const novo = m ? inicio - m[0].length : inicio;
    return livre(novo, inicio) ? novo : inicio;
  };
  const avancarAte = (fim: number, regra: RegExp) => {
    const m = norm.slice(fim).match(regra);
    const novo = m ? fim + m[0].length : fim;
    return livre(fim, novo) ? novo : fim;
  };

  const resultado: ParsedVoiceTask = {
    title: "",
    assigneeId: null,
    assigneeOptions: [],
    dueDate: null,
    dueDateSource: "missing",
    dueTime: DEFAULT_DUE_TIME,
    dueTimeSource: "default",
    priority: "MEDIUM",
    prioritySource: "default",
    departmentId: null,
    departmentSource: "missing",
    notes: [],
    spans,
  };

  // 0. O pedido ("adicionar tarefa pro...") no comeco da frase.
  const comando = COMANDO.exec(norm);
  if (comando && comando[0].trim()) {
    marcar(comando.index, comando.index + comando[0].length, "command");
  }

  // 1. Prioridade. A negacao vem antes, para "nao e urgente" nao virar urgente.
  // O "de"/"com" da frente ("de alta prioridade") sai junto, para nao sobrar no titulo.
  const prioridades: Array<[RegExp, TaskPriority]> = [
    [/\b(?:nao (?:e|eh) (?:urgente|prioridade|importante|pra ja)|sem pressa|quando (?:der|puder)|(?:(?:de|com)\s+)?(?:prioridade baixa|baixa prioridade))\b/, "LOW"],
    [/\b(?:(?:(?:de|com)\s+)?prioridade (?:urgente|maxima)|urgentissim[oa]|urgente|com urgencia|o quanto antes|o mais rapido possivel)\b/, "URGENT"],
    [/\b(?:(?:(?:de|com)\s+)?(?:prioridade alta|alta prioridade)|importante)\b/, "HIGH"],
    [/\b(?:(?:de|com)\s+)?(?:prioridade (?:media|normal)|media prioridade)\b/, "MEDIUM"],
  ];

  for (const [regra, prioridade] of prioridades) {
    const m = regra.exec(norm);
    if (m && marcar(m.index, m.index + m[0].length, "priority")) {
      resultado.priority = prioridade;
      resultado.prioritySource = "spoken";
      break;
    }
  }

  // 2. Pessoa. Nome completo vale mais que so o primeiro nome; primeiro nome
  // repetido na equipe vira escolha, e nao chute. A comparacao e pelo som
  // (nameKey), palavra a palavra.
  const achados: Array<{ inicio: number; fim: number; ids: string[] }> = [];
  const palavras = [...norm.matchAll(/[a-z0-9]+/g)].map((m) => ({
    inicio: m.index,
    fim: m.index + m[0].length,
    chave: nameKey(m[0]),
  }));
  const procurar = (chaves: string[], ids: string[]) => {
    for (let i = 0; i + chaves.length <= palavras.length; i += 1) {
      if (chaves.every((chave, j) => palavras[i + j].chave === chave)) {
        achados.push({ inicio: palavras[i].inicio, fim: palavras[i + chaves.length - 1].fim, ids });
      }
    }
  };
  const porPrimeiroNome = new Map<string, string[]>();

  for (const pessoa of ctx.people) {
    const partes = fold(pessoa.name).trim().split(/\s+/).filter(Boolean).map(nameKey);
    if (partes.length === 0) {
      continue;
    }
    if (partes.length > 1) {
      procurar(partes, [pessoa.id]);
    }
    porPrimeiroNome.set(partes[0], [...(porPrimeiroNome.get(partes[0]) ?? []), pessoa.id]);
  }

  for (const [primeiro, ids] of porPrimeiroNome) {
    procurar([primeiro], ids);
  }

  achados.sort((a, b) => a.inicio - b.inicio || b.fim - b.inicio - (a.fim - a.inicio));
  const citados = achados.filter(
    (achado) =>
      livre(achado.inicio, achado.fim) &&
      marcar(voltarAte(achado.inicio, ANTES_DA_PESSOA), avancarAte(achado.fim, DEPOIS_DA_PESSOA), "person"),
  );

  if (citados.length > 0) {
    const primeiro = citados[0];
    if (primeiro.ids.length === 1) {
      resultado.assigneeId = primeiro.ids[0];
    } else {
      resultado.assigneeOptions = [...primeiro.ids];
      resultado.notes.push({ kind: "pick-person", text: "Há mais de uma pessoa com esse nome. Quem faz?" });
    }
    const outros = citados.slice(1).filter((c) => c.ids.join() !== primeiro.ids.join());
    if (outros.length > 0 && resultado.assigneeId) {
      const nome = ctx.people.find((p) => p.id === resultado.assigneeId)?.name ?? "";
      resultado.notes.push({ kind: "info", text: `Você citou mais de uma pessoa. A tarefa vai para ${nome}; troque se precisar.` });
    }
  } else {
    const paraMim = /\b(?:pra mim|para mim|eu (?:preciso|tenho que|tenho de|vou|devo))\b/.exec(norm);
    if (paraMim && marcar(paraMim.index, paraMim.index + paraMim[0].length, "person")) {
      resultado.assigneeId = ctx.meId;
    }
  }

  if (!resultado.assigneeId && resultado.assigneeOptions.length === 0) {
    resultado.notes.push({ kind: "info", text: "Não encontramos quem vai fazer. Escolha abaixo." });
  }

  // 3. Prazo.
  const diaDaSemana = hoje.getUTCDay();
  const proximo = (alvo: number) => somar((alvo - diaDaSemana + 7) % 7 || 7);
  const datas: Array<Regra<Dia>> = [
    [/\bdepois de amanha\b/g, () => somar(2)],
    [/\bamanha\b/g, () => somar(1)],
    [/\bhoje\b/g, () => somar(0)],
    [/\b(?:semana que vem|proxima semana)\b/g, () => proximo(1)],
    [
      /\b(?:(proxim[oa])\s+)?(segunda|terca|quarta|quinta|sexta|sabado|domingo)(\s*-?\s*feira)?(\s+que\s+vem)?\b/g,
      (m) => {
        const antes = norm.slice(0, m.index);
        const depois = norm.slice(m.index + m[0].length);
        // "segunda via do boleto" nao e segunda-feira: so vale com uma pista
        // de que se fala do dia.
        const ehDia =
          m[1] ||
          m[3] ||
          m[4] ||
          /\b(?:ate|para|pra|na|no|nesta|nessa|essa|esta|de)\s+(?:a\s+|o\s+)?$/.test(antes) ||
          /^\s*(?:$|[,.;!?]|(?:de|da|pela)\s+(?:manha|tarde|noite)|as\s+\d|cedo)/.test(depois);
        return ehDia ? proximo(DIAS_DA_SEMANA[m[2]]) : null;
      },
    ],
    [
      /\bdia (\d{1,2})(?: de (janeiro|fevereiro|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro))?\b/g,
      (m) => {
        const dia = Number(m[1]);
        const temMes = m[2] !== undefined;
        const mes = temMes ? MESES[m[2]] : hoje.getUTCMonth();
        let data = criarDia(hoje.getUTCFullYear(), mes, dia);
        if (!data) {
          return null;
        }
        // Dia que ja passou e o do proximo mes (ou do proximo ano, se o mes foi dito).
        if (data < hoje) {
          data = temMes ? criarDia(hoje.getUTCFullYear() + 1, mes, dia) : criarDia(hoje.getUTCFullYear(), mes + 1, dia);
        }
        return data;
      },
    ],
    [
      /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g,
      (m) => {
        const dia = Number(m[1]);
        const mes = Number(m[2]) - 1;
        if (mes < 0 || mes > 11) {
          return null;
        }
        const ano = m[3] ? (Number(m[3]) < 100 ? 2000 + Number(m[3]) : Number(m[3])) : hoje.getUTCFullYear();
        const data = criarDia(ano, mes, dia);
        if (data && !m[3] && data < hoje) {
          return criarDia(ano + 1, mes, dia);
        }
        return data;
      },
    ],
    [
      /\b(?:em|daqui a|daqui)\s+(\d{1,2}|um|uma|dois|duas|tres|quatro|cinco|seis|sete|oito|nove|dez|quinze|trinta)\s+(dias?|semanas?)\b/g,
      (m) => {
        const n = /^\d+$/.test(m[1]) ? Number(m[1]) : NUMEROS[m[1]];
        if (!n) {
          return null;
        }
        return somar(/^semana/.test(m[2]) ? n * 7 : n);
      },
    ],
    [/\b(?:fim|final) do mes\b/g, () => new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() + 1, 0))],
  ];

  achar: for (const [regra, ler] of datas) {
    regra.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regra.exec(norm))) {
      if (!livre(m.index, m.index + m[0].length)) {
        continue;
      }
      const data = ler(m);
      if (data && marcar(voltarAte(m.index, ANTES_DO_PRAZO), m.index + m[0].length, "date")) {
        resultado.dueDate = texto(data);
        resultado.dueDateSource = "spoken";
        break achar;
      }
    }
  }

  // 4. Horario.
  const hora = (h: string | number, min: string | number | undefined, periodo?: string): [number, number] | null => {
    let horas = Number(h);
    const minutos = Number(min ?? 0);
    if ((periodo === "tarde" || periodo === "noite") && horas < 12) {
      horas += 12;
    }
    return horas > 23 || minutos > 59 ? null : [horas, minutos];
  };
  const horarios: Array<Regra<[number, number]>> = [
    [/\b(?:(?:ate )?as\s+)?(\d{1,2})\s*(?:h|:)\s*(\d{2})?(?:\s+da\s+(manha|tarde|noite))?(?!\w)/g, (m) => hora(m[1], m[2], m[3])],
    [/\b(?:(?:ate )?as\s+)?(\d{1,2})\s+horas?(?:\s+da\s+(manha|tarde|noite))?\b/g, (m) => hora(m[1], 0, m[2])],
    [
      /\b(?:ate )?as\s+(\d{1,2})(?:\s+da\s+(manha|tarde|noite))?\b/g,
      (m) => {
        // "as 9" so vale no fim da frase ou com "da manha/tarde": "as 3 notas" nao e horario.
        if (!m[2] && !/^\s*(?:$|[,.;!?])/.test(norm.slice(m.index + m[0].length))) {
          return null;
        }
        return hora(m[1], 0, m[2]);
      },
    ],
    [/\bmeio[\s-]?dia\b/g, () => [12, 0]],
    [/\b(?:logo cedo|cedo|de manha|pela manha)\b/g, () => [9, 0]],
    [/\b(?:depois do almoco|a tarde|pela tarde|de tarde)\b/g, () => [14, 0]],
    [/\b(?:fim do dia|final do dia|fim da tarde|final da tarde)\b/g, () => [17, 0]],
    [/\b(?:a noite|de noite)\b/g, () => [19, 0]],
  ];

  acharHora: for (const [regra, ler] of horarios) {
    regra.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regra.exec(norm))) {
      if (!livre(m.index, m.index + m[0].length)) {
        continue;
      }
      const lida = ler(m);
      if (lida && marcar(m.index, m.index + m[0].length, "time")) {
        resultado.dueTime = `${String(lida[0]).padStart(2, "0")}:${String(lida[1]).padStart(2, "0")}`;
        resultado.dueTimeSource = "spoken";
        break acharHora;
      }
    }
  }

  // So o horario, sem o dia: hoje, se ainda da tempo; senao amanha.
  if (resultado.dueTimeSource === "spoken" && !resultado.dueDate) {
    const hojeNaHora = dueDateAt(texto(hoje), resultado.dueTime);
    resultado.dueDate = texto(hojeNaHora && hojeNaHora > ctx.now ? hoje : somar(1));
    resultado.dueDateSource = "default";
  }

  if (!resultado.dueDate) {
    resultado.notes.push({ kind: "info", text: "Não encontramos o prazo. Escolha a data." });
  }

  // 5. Setor. "setor de estoque" sai do titulo; "estoque" solto so indica o
  // setor e continua no titulo ("conferir o estoque").
  for (const setor of ctx.departments) {
    const chave = escapeRegex(fold(setor.name).trim());
    if (!chave) {
      continue;
    }
    const forte = new RegExp(`\\b(?:(?:no|do|da|na|pro|pra|para o)\\s+)?setor\\s+(?:de\\s+|do\\s+|da\\s+)?${chave}\\b`).exec(norm);
    if (forte && marcar(forte.index, forte.index + forte[0].length, "department")) {
      resultado.departmentId = setor.id;
      resultado.departmentSource = "spoken";
      break;
    }
    const solto = new RegExp(`\\b${chave}\\b`).exec(norm);
    if (solto && marcar(solto.index, solto.index + solto[0].length, "department", false)) {
      resultado.departmentId = setor.id;
      resultado.departmentSource = "spoken";
      break;
    }
  }

  if (!resultado.departmentId && resultado.assigneeId) {
    const setorDaPessoa = ctx.people.find((p) => p.id === resultado.assigneeId)?.departmentId ?? null;
    if (setorDaPessoa && ctx.departments.some((d) => d.id === setorDaPessoa)) {
      resultado.departmentId = setorDaPessoa;
      resultado.departmentSource = "assignee";
    }
  }

  // 6. Titulo: o que sobrou da frase.
  let sobra = "";
  for (let i = 0; i < original.length; i += 1) {
    const removido = spans.some((s) => s.remove && i >= s.start && i < s.end);
    sobra += removido ? " " : original[i];
  }
  resultado.title = cleanTitle(sobra);

  if (!resultado.title) {
    resultado.notes.push({ kind: "info", text: "Não entendemos o que precisa ser feito. Escreva o título." });
  }

  return resultado;
}
