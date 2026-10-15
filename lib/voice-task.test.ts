import { describe, expect, it } from "vitest";
import { cleanTitle, parseVoiceTask, type VoiceContext } from "./voice-task";

// Quinta-feira, 15/10/2026, 14h em Brasilia.
const agora = new Date("2026-10-15T17:00:00.000Z");

const ctx: VoiceContext = {
  now: agora,
  meId: "eu",
  people: [
    { id: "eu", name: "Nicollas Petrin", departmentId: "adm" },
    { id: "bruno", name: "Bruno Lima", departmentId: "estoque" },
    { id: "diego", name: "Diego Rocha", departmentId: "acougue" },
    { id: "elaine", name: "Elaine Prado", departmentId: "horti" },
    { id: "ana-s", name: "Ana Souza", departmentId: "caixa" },
    { id: "ana-r", name: "Ana Ribeiro", departmentId: "horti" },
    { id: "carla", name: "Carla Mendes", departmentId: "acougue" },
  ],
  departments: [
    { id: "estoque", name: "Estoque" },
    { id: "caixa", name: "Caixa" },
    { id: "acougue", name: "Açougue" },
    { id: "horti", name: "Hortifruti" },
    { id: "adm", name: "Administrativo" },
  ],
};

const ler = (frase: string, contexto: VoiceContext = ctx) => parseVoiceTask(frase, contexto);

describe("parseVoiceTask", () => {
  it("reads person, weekday and urgency, and keeps the rest as the title", () => {
    const r = ler("Bruno, conferir a validade dos iogurtes da gôndola 3 até sexta, é urgente");

    expect(r.title).toBe("Conferir a validade dos iogurtes da gôndola 3");
    expect(r.assigneeId).toBe("bruno");
    expect(r.dueDate).toBe("2026-10-16");
    expect(r.dueTime).toBe("17:00");
    expect(r.dueTimeSource).toBe("default");
    expect(r.priority).toBe("URGENT");
    expect(r.departmentId).toBe("estoque");
    expect(r.departmentSource).toBe("assignee");
  });

  it("understands 'pede pro' and 'depois do almoço'", () => {
    const r = ler("Pede pro Diego limpar a câmara fria hoje depois do almoço");

    expect(r.title).toBe("Limpar a câmara fria");
    expect(r.assigneeId).toBe("diego");
    expect(r.dueDate).toBe("2026-10-15");
    expect(r.dueTime).toBe("14:00");
  });

  it("reads 'dia 28' and 'sem pressa'", () => {
    const r = ler("Elaine repor tomates e bananas na entrada dia 28, sem pressa");

    expect(r.title).toBe("Repor tomates e bananas na entrada");
    expect(r.assigneeId).toBe("elaine");
    expect(r.dueDate).toBe("2026-10-28");
    expect(r.priority).toBe("LOW");
  });

  it("asks who it is when two people share the first name, instead of guessing", () => {
    const r = ler("Ana, contar o troco do cofre amanhã às 9h");

    expect(r.assigneeId).toBeNull();
    expect(r.assigneeOptions.sort()).toEqual(["ana-r", "ana-s"]);
    expect(r.notes.some((n) => n.kind === "pick-person")).toBe(true);
    expect(r.dueDate).toBe("2026-10-16");
    expect(r.dueTime).toBe("09:00");
    expect(r.title).toBe("Contar o troco do cofre");
  });

  it("picks the right person when the full name is said", () => {
    expect(ler("Ana Ribeiro separar as caixas vazias").assigneeId).toBe("ana-r");
  });

  it("reads 'lembra a', 'cedo' and 'importante'", () => {
    const r = ler("Lembra a Carla de ligar pro fornecedor de embalagens amanhã cedo, importante");

    expect(r.title).toBe("Ligar pro fornecedor de embalagens");
    expect(r.assigneeId).toBe("carla");
    expect(r.dueTime).toBe("09:00");
    expect(r.priority).toBe("HIGH");
  });

  it("leaves the person blank when nobody is named", () => {
    const r = ler("Organizar o depósito do fundo até segunda");

    expect(r.assigneeId).toBeNull();
    expect(r.title).toBe("Organizar o depósito do fundo");
    expect(r.dueDate).toBe("2026-10-19");
    expect(r.notes.some((n) => /quem vai fazer/.test(n.text))).toBe(true);
  });

  it("does not take 'segunda via' for Monday, and reads dd/mm with time", () => {
    const r = ler("Emitir segunda via do boleto pra mim até 15/11 às 14:30");

    expect(r.title).toBe("Emitir segunda via do boleto");
    expect(r.assigneeId).toBe("eu");
    expect(r.dueDate).toBe("2026-11-15");
    expect(r.dueTime).toBe("14:30");
  });

  it("does not take 'não é urgente' for urgent", () => {
    const r = ler("Diego, não é urgente, varrer o estacionamento semana que vem");

    expect(r.priority).toBe("LOW");
    expect(r.dueDate).toBe("2026-10-19");
    expect(r.title).toBe("Varrer o estacionamento");
  });

  it("does not take 'às 3 notas' for a time", () => {
    const r = ler("Bruno conferir as 3 notas do fornecedor amanhã");

    expect(r.dueTimeSource).toBe("default");
    expect(r.title).toBe("Conferir as 3 notas do fornecedor");
  });

  it("puts a time without a day today if there is still time, otherwise tomorrow", () => {
    expect(ler("Bruno ligar pro contador às 16h").dueDate).toBe("2026-10-15");
    expect(ler("Bruno ligar pro contador às 10h").dueDate).toBe("2026-10-16");
    expect(ler("Bruno ligar pro contador às 10h").dueDateSource).toBe("default");
  });

  it("takes 'setor de X' out of the title but keeps a bare department word in it", () => {
    const forte = ler("Bruno limpar as prateleiras do setor de hortifruti amanhã");
    expect(forte.departmentId).toBe("horti");
    expect(forte.title).toBe("Limpar as prateleiras");

    const solto = ler("Bruno conferir o caixa amanhã");
    expect(solto.departmentId).toBe("caixa");
    expect(solto.title).toBe("Conferir o caixa");
  });

  it("matches department names with accents however they are spoken", () => {
    expect(ler("Carla moer a carne do setor de acougue hoje").departmentId).toBe("acougue");
  });

  it("reads relative days and the end of the month", () => {
    expect(ler("Bruno contar o estoque daqui a 3 dias").dueDate).toBe("2026-10-18");
    expect(ler("Bruno contar o estoque em duas semanas").dueDate).toBe("2026-10-29");
    expect(ler("Bruno fechar o balanço no fim do mês").dueDate).toBe("2026-10-31");
    expect(ler("Bruno pagar o aluguel depois de amanhã").dueDate).toBe("2026-10-17");
  });

  it("rolls a day that already passed to the next month", () => {
    expect(ler("Bruno renovar o alvará dia 10").dueDate).toBe("2026-11-10");
    expect(ler("Bruno renovar o alvará dia 10 de março").dueDate).toBe("2027-03-10");
  });

  it("uses the Brasilia calendar day, even late at night when UTC is already tomorrow", () => {
    // 23h de quinta em Brasilia = 02h de sexta em UTC.
    const noite = { ...ctx, now: new Date("2026-10-16T02:00:00.000Z") };
    expect(ler("Bruno abrir a loja amanhã", noite).dueDate).toBe("2026-10-16");
  });

  it("marks the recognised parts at their positions in the original phrase", () => {
    const frase = "Bruno, conferir o caixa amanhã";
    const r = ler(frase);
    const trecho = (kind: string) => r.spans.filter((s) => s.kind === kind).map((s) => frase.slice(s.start, s.end).trim());

    expect(trecho("person")).toEqual(["Bruno,"]);
    expect(trecho("date")).toEqual(["amanhã"]);
  });
});

describe("cleanTitle", () => {
  it("drops filler words and punctuation left at the ends", () => {
    expect(cleanTitle(" , por favor  repor o leite  e ")).toBe("Repor o leite");
  });
});
