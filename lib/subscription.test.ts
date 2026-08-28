import { describe, expect, it } from "vitest";
import {
  buildReminderContent,
  GRACE_PERIOD_DAYS,
  REMINDER_WINDOW_DAYS,
  assertCompanyHasActivePlan,
  getActivePlanCode,
  getSubscriptionWindow,
} from "./subscription";

const now = new Date("2026-08-20T12:00:00.000Z");
const DAY_MS = 24 * 60 * 60 * 1000;

function companyEndingIn(days: number) {
  return {
    subscriptions: [
      {
        currentPeriodEnd: new Date(now.getTime() + days * DAY_MS),
        plan: { code: "MANAGEMENT" as const },
      },
    ],
  };
}

describe("getSubscriptionWindow", () => {
  it("reports an active plan far from renewal without nagging", () => {
    const window = getSubscriptionWindow(companyEndingIn(20), now);

    expect(window.phase).toBe("active");
    expect(window.daysRemaining).toBe(20);
    expect(window.hasAccess).toBe(true);
    expect(window.shouldRemind).toBe(false);
  });

  it("starts reminding exactly at the reminder window", () => {
    const window = getSubscriptionWindow(companyEndingIn(REMINDER_WINDOW_DAYS), now);

    expect(window.phase).toBe("expiring");
    expect(window.daysRemaining).toBe(REMINDER_WINDOW_DAYS);
    expect(window.shouldRemind).toBe(true);
    expect(window.hasAccess).toBe(true);
  });

  it("does not remind one day before the window opens", () => {
    const window = getSubscriptionWindow(companyEndingIn(REMINDER_WINDOW_DAYS + 1), now);

    expect(window.phase).toBe("active");
    expect(window.shouldRemind).toBe(false);
  });

  it("rounds partial days up so a few hours left still counts as a day", () => {
    const window = getSubscriptionWindow(companyEndingIn(0.2), now);

    expect(window.daysRemaining).toBe(1);
    expect(window.hasAccess).toBe(true);
  });

  it("keeps access during the grace period", () => {
    const window = getSubscriptionWindow(companyEndingIn(-1), now);

    expect(window.phase).toBe("grace");
    expect(window.daysOverdue).toBe(1);
    expect(window.hasAccess).toBe(true);
    expect(window.shouldRemind).toBe(true);
  });

  it("still grants access moments after expiry", () => {
    const window = getSubscriptionWindow(companyEndingIn(-0.01), now);

    expect(window.phase).toBe("grace");
    expect(window.daysOverdue).toBe(0);
    expect(window.hasAccess).toBe(true);
  });

  it("suspends once the grace period is fully consumed", () => {
    const window = getSubscriptionWindow(companyEndingIn(-GRACE_PERIOD_DAYS), now);

    expect(window.phase).toBe("suspended");
    expect(window.daysOverdue).toBe(GRACE_PERIOD_DAYS);
    expect(window.hasAccess).toBe(false);
  });

  it("stays suspended well past the grace period", () => {
    const window = getSubscriptionWindow(companyEndingIn(-30), now);

    expect(window.phase).toBe("suspended");
    expect(window.hasAccess).toBe(false);
  });

  it("treats a company without subscription as having none", () => {
    const window = getSubscriptionWindow({ subscriptions: [] }, now);

    expect(window.phase).toBe("none");
    expect(window.hasAccess).toBe(false);
    expect(window.shouldRemind).toBe(false);
  });

  it("ignores an unparseable period end instead of throwing", () => {
    const window = getSubscriptionWindow(
      { subscriptions: [{ currentPeriodEnd: "nao e uma data", plan: { code: "BASIC" } }] },
      now,
    );

    expect(window.phase).toBe("none");
    expect(window.hasAccess).toBe(false);
  });
});

describe("getActivePlanCode", () => {
  it("returns the plan while the subscription is current", () => {
    expect(getActivePlanCode(companyEndingIn(10), now)).toBe("MANAGEMENT");
  });

  it("keeps returning the plan during the grace period", () => {
    expect(getActivePlanCode(companyEndingIn(-1), now)).toBe("MANAGEMENT");
  });

  it("returns null once suspended, which is what locks every feature", () => {
    expect(getActivePlanCode(companyEndingIn(-GRACE_PERIOD_DAYS), now)).toBeNull();
  });

  it("returns null without any subscription", () => {
    expect(getActivePlanCode({ subscriptions: [] }, now)).toBeNull();
  });
});

describe("assertCompanyHasActivePlan", () => {
  it("passes during the grace period", () => {
    expect(assertCompanyHasActivePlan(companyEndingIn(-1), now)).toBe("MANAGEMENT");
  });

  it("explains the suspension instead of the generic missing-plan message", () => {
    expect(() => assertCompanyHasActivePlan(companyEndingIn(-GRACE_PERIOD_DAYS), now)).toThrowError(/suspensa/i);
  });

  it("falls back to the missing-plan message when there is no subscription", () => {
    expect(() => assertCompanyHasActivePlan({ subscriptions: [] }, now)).toThrowError(/nao possui assinatura/i);
  });
});

describe("teste gratuito", () => {
  function emTeste(diasRestantes: number) {
    return {
      subscriptions: [
        {
          currentPeriodEnd: new Date(now.getTime() + diasRestantes * DAY_MS),
          status: "TRIALING",
          plan: { code: "MANAGEMENT" as const },
        },
      ],
    };
  }

  it("marks the window as a trial", () => {
    const window = getSubscriptionWindow(emTeste(30), now);

    expect(window.isTrial).toBe(true);
    expect(window.hasAccess).toBe(true);
    expect(window.daysRemaining).toBe(30);
  });

  it("unlocks the chosen plan during the trial", () => {
    expect(getActivePlanCode(emTeste(30), now)).toBe("MANAGEMENT");
  });

  it("reminds near the end, like any other subscription", () => {
    const window = getSubscriptionWindow(emTeste(3), now);

    expect(window.shouldRemind).toBe(true);
    expect(window.isTrial).toBe(true);
  });

  it("says the trial is ending instead of asking for a late payment", () => {
    const conteudo = buildReminderContent(getSubscriptionWindow(emTeste(3), now), "Gestao");

    expect(conteudo?.title).toMatch(/teste gratuito/i);
    expect(conteudo?.message).not.toMatch(/atrasad/i);
  });

  it("is not a trial when the subscription is already paid", () => {
    const window = getSubscriptionWindow(
      {
        subscriptions: [
          { currentPeriodEnd: new Date(now.getTime() + 30 * DAY_MS), status: "ACTIVE", plan: { code: "BASIC" } },
        ],
      },
      now,
    );

    expect(window.isTrial).toBe(false);
    expect(buildReminderContent(getSubscriptionWindow({ subscriptions: [{ currentPeriodEnd: new Date(now.getTime() + 3 * DAY_MS), status: "ACTIVE", plan: { code: "BASIC" } }] }, now), "Basico")?.title).toMatch(/vence em/i);
  });
});
