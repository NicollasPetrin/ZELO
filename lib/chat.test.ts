import { describe, expect, it } from "vitest";
import {
  conversationLabel,
  departmentChannelKey,
  GENERAL_LABEL,
  generalChannelKey,
  hasUnread,
  isChannel,
  messageDay,
  messageTime,
  sameBlock,
  SUPPORT_LABEL,
  visibleConversationsWhere,
} from "./chat";

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

  it("names the general chat the same for everyone", () => {
    const geral = { kind: "GENERAL" as const, title: null, participants: [] };

    expect(conversationLabel(geral, eu)).toBe(GENERAL_LABEL);
  });

  it("names the team chat after the department, so renaming the department renames the chat", () => {
    const equipe = { kind: "DEPARTMENT" as const, title: null, participants: [], department: { name: "Estoque" } };

    expect(conversationLabel(equipe, eu)).toBe("Equipe Estoque");
    expect(conversationLabel({ ...equipe, department: { name: "Deposito" } }, eu)).toBe("Equipe Deposito");
  });
});

describe("channels", () => {
  it("treats only the general and team chats as channels", () => {
    expect(isChannel("GENERAL")).toBe(true);
    expect(isChannel("DEPARTMENT")).toBe(true);
    expect(isChannel("COMPANY")).toBe(false);
    expect(isChannel("SUPPORT")).toBe(false);
  });

  it("keys one general chat per company and one team chat per department", () => {
    expect(generalChannelKey("c-1")).toBe("general:c-1");
    expect(departmentChannelKey("d-1")).toBe("department:d-1");
    expect(generalChannelKey("c-1")).not.toBe(departmentChannelKey("c-1"));
  });
});

describe("visibleConversationsWhere", () => {
  const pessoa = { id: "u-1", companyId: "c-1", departmentId: "d-1" };

  it("never leaves the company", () => {
    expect(visibleConversationsWhere(pessoa).companyId).toBe("c-1");
  });

  it("opens private and support chats only to their participants", () => {
    expect(visibleConversationsWhere(pessoa).OR).toContainEqual({
      kind: { in: ["COMPANY", "SUPPORT"] },
      participants: { some: { userId: "u-1" } },
    });
  });

  it("opens the general chat to everyone in the company", () => {
    expect(visibleConversationsWhere(pessoa).OR).toContainEqual({ kind: "GENERAL" });
  });

  it("opens the team chat of the department the person is in today, if it is active", () => {
    expect(visibleConversationsWhere(pessoa).OR).toContainEqual({
      kind: "DEPARTMENT",
      departmentId: "d-1",
      department: { isActive: true },
    });
  });

  it("does not let a stored participant row open a team chat", () => {
    const acessos = visibleConversationsWhere(pessoa).OR ?? [];
    const porParticipante = acessos.filter((acesso) => "participants" in acesso);

    expect(porParticipante).toHaveLength(1);
    expect(porParticipante[0].kind).toEqual({ in: ["COMPANY", "SUPPORT"] });
  });

  it("gives no team chat to someone without a department", () => {
    const acessos = visibleConversationsWhere({ ...pessoa, departmentId: null }).OR ?? [];

    expect(acessos.some((acesso) => acesso.kind === "DEPARTMENT")).toBe(false);
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
