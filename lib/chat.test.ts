import { describe, expect, it } from "vitest";
import { conversationLabel, hasUnread, messageDay, messageTime, sameBlock, SUPPORT_LABEL } from "./chat";

const eu = "u-1";

function conversa(participantes: Array<[string, string]>, title: string | null = null) {
  return {
    kind: "COMPANY" as const,
    title,
    participants: participantes.map(([userId, name]) => ({ userId, name })),
  };
}

describe("conversationLabel", () => {
  it("names a two-person conversation after the other person", () => {
    expect(conversationLabel(conversa([[eu, "Nicollas"], ["u-2", "Maria"]]), eu)).toBe("Maria");
  });

  it("keeps a title when someone wrote one", () => {
    expect(conversationLabel(conversa([[eu, "Nicollas"], ["u-2", "Maria"]], "Estoque"), eu)).toBe("Estoque");
  });

  it("lists both names in a three-person conversation", () => {
    expect(conversationLabel(conversa([[eu, "Nicollas"], ["u-2", "Maria"], ["u-3", "Joao"]]), eu)).toBe("Maria e Joao");
  });

  it("stops listing names when the group gets big", () => {
    const grupo = conversa([
      [eu, "Nicollas"],
      ["u-2", "Maria"],
      ["u-3", "Joao"],
      ["u-4", "Ana"],
      ["u-5", "Pedro"],
    ]);

    expect(conversationLabel(grupo, eu)).toBe("Maria, Joao e mais 2");
  });

  it("gives each side of the same conversation its own label", () => {
    const dois = conversa([[eu, "Nicollas"], ["u-2", "Maria"]]);

    expect(conversationLabel(dois, eu)).toBe("Maria");
    expect(conversationLabel(dois, "u-2")).toBe("Nicollas");
  });

  it("always calls the support thread by the same name", () => {
    const suporte = { kind: "SUPPORT" as const, title: "Duvida sobre cobranca", participants: [] };

    expect(conversationLabel(suporte, eu)).toBe(SUPPORT_LABEL);
  });
});

describe("hasUnread", () => {
  const agora = new Date("2026-09-09T12:00:00.000Z");
  const antes = new Date("2026-09-09T11:00:00.000Z");

  it("marks a conversation nobody opened yet", () => {
    expect(hasUnread(agora, null)).toBe(true);
  });

  it("marks a message that arrived after the last read", () => {
    expect(hasUnread(agora, antes)).toBe(true);
  });

  it("leaves an already read conversation alone", () => {
    expect(hasUnread(antes, agora)).toBe(false);
    expect(hasUnread(agora, agora)).toBe(false);
  });

  it("does not mark an empty conversation as unread", () => {
    expect(hasUnread(null, null)).toBe(false);
  });
});

describe("sameBlock", () => {
  const base = new Date("2026-09-09T12:00:00.000Z");
  const depoisDe = (minutos: number) => new Date(base.getTime() + minutos * 60 * 1000);

  it("groups messages the same person sent in sequence", () => {
    expect(
      sameBlock(
        { authorId: "u-2", fromSupport: false, createdAt: base },
        { authorId: "u-2", fromSupport: false, createdAt: depoisDe(1) },
      ),
    ).toBe(true);
  });

  it("breaks the group when someone else writes", () => {
    expect(
      sameBlock(
        { authorId: "u-2", fromSupport: false, createdAt: base },
        { authorId: "u-3", fromSupport: false, createdAt: depoisDe(1) },
      ),
    ).toBe(false);
  });

  it("breaks the group after a long pause", () => {
    expect(
      sameBlock(
        { authorId: "u-2", fromSupport: false, createdAt: base },
        { authorId: "u-2", fromSupport: false, createdAt: depoisDe(30) },
      ),
    ).toBe(false);
  });

  it("never groups support with the person, even when the account is the same", () => {
    expect(
      sameBlock(
        { authorId: "u-9", fromSupport: true, createdAt: base },
        { authorId: "u-9", fromSupport: false, createdAt: depoisDe(1) },
      ),
    ).toBe(false);
  });

  it("has nothing to group with at the top of the list", () => {
    expect(sameBlock(undefined, { authorId: "u-2", fromSupport: false, createdAt: base })).toBe(false);
  });
});

describe("horario das mensagens", () => {
  // 2026-09-09T02:30:00Z e 23:30 do dia 8 em Brasilia. Se a formatacao seguisse
  // o fuso da maquina, servidor e navegador exibiriam dia e hora diferentes
  // para a mesma mensagem — e o React acusaria divergencia na hidratacao.
  const instante = new Date("2026-09-09T02:30:00.000Z");

  it("shows the time in Brasilia, not in the machine timezone", () => {
    expect(messageTime(instante)).toBe("23:30");
  });

  it("keeps the day consistent with that timezone", () => {
    expect(messageDay(instante)).toBe("08/09/2026");
  });
});
