import { describe, expect, it } from "vitest";
import { PERSONAS, decidir, personaDoEmail, sorteio, type TarefaSimulada } from "@/lib/simulation";

const agora = new Date("2026-11-07T13:00:00.000Z");
const atras = (segundos: number) => new Date(agora.getTime() - segundos * 1000);

function tarefa(parcial: Partial<TarefaSimulada> = {}): TarefaSimulada {
  return {
    id: "t1",
    status: "PENDING",
    createdAt: atras(3600),
    updatedAt: atras(3600),
    requiresProof: false,
    provas: 0,
    ...parcial,
  };
}

describe("personaDoEmail", () => {
  it("usa o nome antes do arroba e cai no padrao quando nao conhece", () => {
    expect(personaDoEmail("katia@bomlugar.test")).toBe(PERSONAS.katia);
    expect(personaDoEmail("Rogerio@x.test")).toBe(PERSONAS.rogerio);
    expect(personaDoEmail("fulano@x.test").frasesConcluir.length).toBeGreaterThan(0);
  });
});

describe("sorteio", () => {
  it("e sempre o mesmo para a mesma chave e fica entre 0 e 1", () => {
    expect(sorteio("abc")).toBe(sorteio("abc"));
    for (const chave of ["a", "b", "tarefa-1:ignora", "x".repeat(50)]) {
      expect(sorteio(chave)).toBeGreaterThanOrEqual(0);
      expect(sorteio(chave)).toBeLessThan(1);
    }
  });
});

describe("decidir", () => {
  const thiago = PERSONAS.thiago;

  it("comeca a tarefa depois do tempo de reacao", () => {
    expect(decidir(thiago, tarefa({ createdAt: atras(2) }), [], "u1", agora)).toBeNull();
    expect(decidir(thiago, tarefa({ createdAt: atras(60) }), [], "u1", agora)?.tipo).toBe("comecar");
  });

  it("conclui o que esta em andamento depois do tempo de execucao", () => {
    expect(decidir(thiago, tarefa({ status: "IN_PROGRESS", updatedAt: atras(5) }), [], "u1", agora)).toBeNull();
    expect(decidir(thiago, tarefa({ status: "IN_PROGRESS", updatedAt: atras(200) }), [], "u1", agora)?.tipo).toBe("concluir");
  });

  it("nao mexe em tarefa concluida, cancelada ou em revisao", () => {
    for (const status of ["COMPLETED", "CANCELED", "IN_REVIEW"] as const) {
      expect(decidir(thiago, tarefa({ status }), [], "u1", agora)).toBeNull();
    }
  });

  it("avisa uma vez quando falta a foto e nao conclui", () => {
    const comFoto = tarefa({ status: "IN_PROGRESS", updatedAt: atras(200), requiresProof: true });
    expect(decidir(thiago, comFoto, [], "u1", agora)).toEqual({ tipo: "comentar", comentario: thiago.fraseProva });
    const jaAvisou = [{ authorId: "u1", createdAt: atras(100) }];
    expect(decidir(thiago, comFoto, jaAvisou, "u1", agora)).toBeNull();
    expect(decidir(thiago, { ...comFoto, provas: 1 }, [], "u1", agora)?.tipo).toBe("concluir");
  });

  it("quem ignora a tarefa responde e comeca quando e cobrado", () => {
    const sempreIgnora = { ...PERSONAS.jurandir, ignora: 1 };
    const t = tarefa();
    expect(decidir(sempreIgnora, t, [], "u1", agora)).toBeNull();

    const cobranca = [{ authorId: "dono", createdAt: atras(400) }];
    const resposta = decidir(sempreIgnora, t, cobranca, "u1", agora);
    expect(resposta?.tipo).toBe("comecar");
    expect(sempreIgnora.frasesCobrado).toContain(resposta?.comentario);

    // Respondeu: a cobranca nao ignora mais, segue o tempo normal de reacao.
    const depois = [...cobranca, { authorId: "u1", createdAt: atras(300) }];
    expect(decidir(sempreIgnora, t, depois, "u1", agora)?.tipo).toBe("comecar");
  });

  it("quem some com a tarefa so termina depois de cobrado", () => {
    const sempreSome = { ...PERSONAS.rogerio, abandona: 1 };
    const andamento = tarefa({ status: "IN_PROGRESS", updatedAt: atras(3000) });
    expect(decidir(sempreSome, andamento, [], "u1", agora)).toBeNull();

    const cobranca = [{ authorId: "dono", createdAt: atras(500) }];
    expect(decidir(sempreSome, andamento, cobranca, "u1", agora)?.tipo).toBe("comentar");

    const respondeu = [...cobranca, { authorId: "u1", createdAt: atras(400) }];
    expect(decidir(sempreSome, andamento, respondeu, "u1", agora)?.tipo).toBe("concluir");
  });

  it("espera o tempo de resposta antes de responder a cobranca", () => {
    const cobrancaAgora = [{ authorId: "dono", createdAt: atras(1) }];
    expect(decidir(thiago, tarefa(), cobrancaAgora, "u1", agora)).toBeNull();
  });

  it("gerente sobrecarregada demora mais quanto mais tarefas tem", () => {
    const marcia = { ...PERSONAS.marcia, ignora: 0 };
    const t = tarefa({ createdAt: atras(250) });
    expect(decidir(marcia, t, [], "u1", agora, 1)?.tipo).toBe("comecar");
    expect(decidir(marcia, t, [], "u1", agora, 20)).toBeNull();
  });
});
