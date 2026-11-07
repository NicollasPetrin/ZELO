import type { TaskStatus } from "@prisma/client";

/**
 * Funcionarios simulados da empresa de teste.
 *
 * Numa empresa de demonstracao ninguem de verdade abre a Zelo para fazer as
 * tarefas, entao quem testa cria uma tarefa e nada acontece. Aqui cada pessoa
 * da equipe ficticia ganha um jeito de trabalhar: quanto demora para ver a
 * tarefa, quanto leva para fazer, se some com ela, como reage a uma cobranca
 * e o que comenta. O motor (features/simulation/engine.ts) le estas regras e
 * mexe nas tarefas pelos mesmos caminhos que uma pessoa usaria.
 *
 * O tempo e comprimido: segundos aqui valem horas de loja, para que quem
 * testa veja a equipe reagir enquanto olha a tela.
 */
export type Persona = {
  /** Segundos entre a tarefa chegar e a pessoa comecar. */
  reacao: [number, number];
  /** Segundos entre comecar e concluir. */
  execucao: [number, number];
  /** Segundos entre uma cobranca e a resposta. */
  resposta: [number, number];
  /** Chance de nunca pegar a tarefa sozinha. Uma cobranca resolve. */
  ignora: number;
  /** Chance de comecar, dizer que faz e sumir. Uma cobranca resolve. */
  abandona: number;
  /** Chance de comentar ao comecar e ao concluir. */
  falaAoComecar: number;
  falaAoConcluir: number;
  /** Quanto cada tarefa aberta a mais atrasa a reacao (gerente sobrecarregada). */
  pesoDaCarga: number;
  frasesComecar: string[];
  frasesConcluir: string[];
  frasesCobrado: string[];
  fraseProva: string;
};

const PADRAO: Persona = {
  reacao: [40, 120],
  execucao: [60, 180],
  resposta: [30, 90],
  ignora: 0.1,
  abandona: 0.05,
  falaAoComecar: 0.2,
  falaAoConcluir: 0.2,
  pesoDaCarga: 0,
  frasesComecar: ["Vi aqui, já vou fazer."],
  frasesConcluir: ["Feito."],
  frasesCobrado: ["Desculpa, não tinha visto. Vou fazer agora."],
  fraseProva: "Fiz, mas não consegui anexar a foto. Alguém me ajuda?",
};

export const PERSONAS: Record<string, Persona> = {
  marcia: {
    ...PADRAO,
    reacao: [60, 240],
    execucao: [60, 200],
    ignora: 0.25,
    abandona: 0.15,
    falaAoComecar: 0.3,
    falaAoConcluir: 0.3,
    pesoDaCarga: 0.25,
    frasesComecar: ["Gente, eu sou uma só. Mas vou.", "Tô apagando incêndio no salão, já pego essa."],
    frasesConcluir: ["Pronto. Próxima!", "Feito, entre um fornecedor e outro."],
    frasesCobrado: ["Eu sei, eu sei. Tá na minha lista, juro.", "Desculpa, Seu Valdir, o dia virou. Faço agora."],
    fraseProva: "Fiz, mas não tive tempo de tirar a foto. Depois mando.",
  },
  thiago: {
    ...PADRAO,
    reacao: [10, 40],
    execucao: [30, 90],
    ignora: 0,
    abandona: 0,
    falaAoComecar: 0.4,
    falaAoConcluir: 0.5,
    frasesComecar: ["Tá na Zelo, gente, é só abrir. Já tô fazendo.", "Peguei. Atualizo aqui quando terminar."],
    frasesConcluir: ["Feito e registrado, como tem que ser.", "Concluído. Viu como é fácil?"],
    frasesCobrado: ["Opa, já tô em cima!"],
    fraseProva: "Fiz. Vou subir a foto pelo computador do escritório.",
  },
  neusa: {
    ...PADRAO,
    reacao: [90, 240],
    execucao: [60, 150],
    ignora: 0,
    abandona: 0,
    falaAoComecar: 0.15,
    falaAoConcluir: 0.5,
    frasesComecar: ["Anotei no caderno também, por garantia."],
    frasesConcluir: ["Conferido e lançado. Pode ver no caderno também.", "Feito. Bati centavo por centavo."],
    frasesCobrado: ["Já estava fazendo, não precisa ficar mandando mensagem."],
    fraseProva: "Fiz, mas não sei pôr foto aqui. A neta vem amanhã.",
  },
  jurandir: {
    ...PADRAO,
    reacao: [120, 300],
    execucao: [60, 180],
    resposta: [60, 150],
    ignora: 0.75,
    abandona: 0.2,
    falaAoComecar: 0.1,
    falaAoConcluir: 0.1,
    frasesComecar: ["Tá aqui, ó. Anotei no papel do gancho."],
    frasesConcluir: ["Feito. O Wesley que apertou o botão."],
    frasesCobrado: ["Trinta anos sem aplicativo. Tá no papel do gancho. Já faço.", "O Wesley me mostrou. Tô fazendo, pode sossegar."],
    fraseProva: "Foto? Vem ver com os próprios olhos.",
  },
  wesley: {
    ...PADRAO,
    reacao: [40, 150],
    execucao: [40, 120],
    ignora: 0.2,
    abandona: 0.1,
    falaAoComecar: 0.25,
    frasesComecar: ["Pode deixar, vou falar com o Seu Jura."],
    frasesConcluir: ["Feito, o Seu Jura aprovou."],
    frasesCobrado: ["Foi mal, tava na desossa. Já faço."],
    fraseProva: "Fiz, mas a câmera do celular tá ruim. Mando depois.",
  },
  katia: {
    ...PADRAO,
    reacao: [15, 60],
    execucao: [30, 90],
    ignora: 0.05,
    abandona: 0.1,
    falaAoComecar: 0.1,
    falaAoConcluir: 0.35,
    frasesComecar: ["Manda áudio que eu tô no caixa."],
    frasesConcluir: ["Feito! Mandei áudio também.", "Caixa fechado e conferido, não furou um centavo."],
    frasesCobrado: ["Já fiz, só esqueci de marcar. Mandei áudio!"],
    fraseProva: "Tirei a foto, mas tá no meu WhatsApp. Te mando lá.",
  },
  bianca: {
    ...PADRAO,
    reacao: [20, 60],
    execucao: [20, 60],
    ignora: 0.3,
    abandona: 0,
    falaAoComecar: 0.1,
    falaAoConcluir: 0.2,
    frasesComecar: ["Vi agora."],
    frasesConcluir: ["Feito. Era só me marcar que eu fazia."],
    frasesCobrado: ["Ninguém me marcou, então não vi. Fazendo."],
    fraseProva: "Fiz, mas o app pediu permissão da câmera e eu neguei sem querer.",
  },
  rogerio: {
    ...PADRAO,
    reacao: [30, 90],
    execucao: [60, 150],
    ignora: 0.1,
    abandona: 0.6,
    falaAoComecar: 0.8,
    falaAoConcluir: 0.2,
    frasesComecar: ["Deixa comigo, chefe!", "Já tô indo, chefe, deixa comigo."],
    frasesConcluir: ["Feito, chefe. Falei que deixava comigo."],
    frasesCobrado: ["Foi mal, chefe, me chamaram no depósito. Tô indo agora.", "Eita, esqueci. Agora vai!"],
    fraseProva: "Fiz, mas a bateria acabou antes da foto.",
  },
  edinaldo: {
    ...PADRAO,
    reacao: [40, 120],
    execucao: [60, 150],
    ignora: 0.1,
    abandona: 0,
    falaAoComecar: 0,
    falaAoConcluir: 0,
    frasesCobrado: ["Me fala o que é que eu faço, só não me pede pra digitar."],
    fraseProva: "Fiz. Foto não sei.",
  },
  luana: {
    ...PADRAO,
    reacao: [30, 120],
    execucao: [40, 120],
    ignora: 0.15,
    abandona: 0.05,
    falaAoComecar: 0.2,
    falaAoConcluir: 0.4,
    frasesComecar: ["Se mexerem na minha banca de novo, eu juro…"],
    frasesConcluir: ["Feito. Banca linda, ninguém mexe.", "Pronto. Descartei e dessa vez anotei."],
    frasesCobrado: ["Tava resolvendo a banca que bagunçaram. Já faço."],
    fraseProva: "Fiz, a banca tá linda, vem ver.",
  },
  matheus: {
    ...PADRAO,
    reacao: [20, 180],
    execucao: [30, 120],
    ignora: 0.05,
    abandona: 0.15,
    falaAoComecar: 0.3,
    falaAoConcluir: 0.2,
    frasesComecar: ["Tô na rua, faço quando voltar.", "Separa aí que eu pego."],
    frasesConcluir: ["Entregue! Tatuapé inteiro rodado."],
    frasesCobrado: ["Tava na rua, chefe. Voltei, já faço."],
    fraseProva: "Fiz, a foto ficou tremida da moto.",
  },
  cida: {
    ...PADRAO,
    reacao: [90, 240],
    execucao: [40, 120],
    ignora: 0,
    abandona: 0,
    falaAoComecar: 0,
    falaAoConcluir: 0.3,
    frasesConcluir: ["Ninguém me avisou, mas eu já limpei."],
    frasesCobrado: ["Pode deixar, eu já tinha visto."],
    fraseProva: "Quem tira foto é a minha neta. Mas tá limpinho.",
  },
};

/** A pessoa simulada sai do e-mail: valdir@bomlugar.test vira "valdir". */
export function personaDoEmail(email: string): Persona {
  const chave = email.split("@")[0]?.toLowerCase() ?? "";
  return PERSONAS[chave] ?? PADRAO;
}

/**
 * Numero entre 0 e 1 sempre igual para a mesma chave.
 *
 * A decisao de "esta tarefa o Rogerio vai esquecer" tem que ser a mesma em
 * cada rodada; um sorteio novo a cada 10 segundos acabaria fazendo tudo.
 */
export function sorteio(chave: string): number {
  let h = 2166136261;
  for (let i = 0; i < chave.length; i++) {
    h ^= chave.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

function entre([min, max]: [number, number], chave: string) {
  return (min + (max - min) * sorteio(chave)) * 1000;
}

function escolha(frases: string[], chave: string) {
  if (frases.length === 0) return undefined;
  return frases[Math.floor(sorteio(chave) * frases.length) % frases.length];
}

export type TarefaSimulada = {
  id: string;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  requiresProof: boolean;
  provas: number;
};

export type ComentarioSimulado = { authorId: string; createdAt: Date };

export type Decisao =
  | { tipo: "comecar"; comentario?: string }
  | { tipo: "concluir"; comentario?: string }
  | { tipo: "comentar"; comentario: string };

/**
 * O que a pessoa faz agora com esta tarefa, ou nada.
 *
 * `carga` e quantas tarefas abertas ela tem; so pesa para quem tem
 * `pesoDaCarga`. Comentario de outra pessoa conta como cobranca: quem
 * ignorava ou tinha sumido com a tarefa responde e passa a fazer.
 */
export function decidir(
  persona: Persona,
  tarefa: TarefaSimulada,
  comentarios: ComentarioSimulado[],
  responsavelId: string,
  agora: Date,
  carga = 0,
): Decisao | null {
  if (tarefa.status !== "PENDING" && tarefa.status !== "OVERDUE" && tarefa.status !== "IN_PROGRESS") {
    return null;
  }

  const meus = comentarios.filter((c) => c.authorId === responsavelId);
  const deOutros = comentarios.filter((c) => c.authorId !== responsavelId);
  const ultimo = (lista: ComentarioSimulado[]) =>
    lista.reduce<number | null>((max, c) => (max === null || c.createdAt.getTime() > max ? c.createdAt.getTime() : max), null);
  const ultimaCobranca = ultimo(deOutros);
  const ultimaResposta = ultimo(meus);
  const foiCobrado = ultimaCobranca !== null;
  const t = agora.getTime();
  const semProva = tarefa.requiresProof && tarefa.provas === 0;

  // Cobranca sem resposta: responde, e se ainda nao tinha comecado, comeca.
  if (ultimaCobranca !== null && (ultimaResposta === null || ultimaCobranca > ultimaResposta)) {
    if (t - ultimaCobranca < entre(persona.resposta, `${tarefa.id}:resposta:${ultimaCobranca}`)) {
      return null;
    }

    const fala = escolha(persona.frasesCobrado, `${tarefa.id}:cobrado:${ultimaCobranca}`) ?? PADRAO.frasesCobrado[0];
    return tarefa.status === "IN_PROGRESS" ? { tipo: "comentar", comentario: fala } : { tipo: "comecar", comentario: fala };
  }

  if (tarefa.status === "IN_PROGRESS") {
    if (!foiCobrado && sorteio(`${tarefa.id}:abandona`) < persona.abandona) {
      return null;
    }

    if (t - tarefa.updatedAt.getTime() < entre(persona.execucao, `${tarefa.id}:execucao`)) {
      return null;
    }

    if (semProva) {
      // Avisa uma vez so, depois de comecar. A foto quem resolve e o gestor.
      const jaAvisou = ultimaResposta !== null && ultimaResposta >= tarefa.updatedAt.getTime();
      return jaAvisou ? null : { tipo: "comentar", comentario: persona.fraseProva };
    }

    const fala = sorteio(`${tarefa.id}:fala-fim`) < persona.falaAoConcluir ? escolha(persona.frasesConcluir, `${tarefa.id}:frase-fim`) : undefined;
    return { tipo: "concluir", comentario: fala };
  }

  if (!foiCobrado && sorteio(`${tarefa.id}:ignora`) < persona.ignora) {
    return null;
  }

  const atraso = 1 + persona.pesoDaCarga * Math.max(0, carga - 1);
  if (t - tarefa.createdAt.getTime() < entre(persona.reacao, `${tarefa.id}:reacao`) * atraso) {
    return null;
  }

  const fala = sorteio(`${tarefa.id}:fala-inicio`) < persona.falaAoComecar ? escolha(persona.frasesComecar, `${tarefa.id}:frase-inicio`) : undefined;
  return { tipo: "comecar", comentario: fala };
}
