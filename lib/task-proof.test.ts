import { describe, expect, it } from "vitest";
import {
  buildProofKey,
  canComplete,
  PROOF_MAX_BYTES,
  statusAfterProof,
  statusAfterRejection,
  validateProofFile,
} from "./task-proof";

describe("validateProofFile", () => {
  it("accepts the formats a phone camera produces", () => {
    for (const [tipo, extensao] of [
      ["image/jpeg", "jpg"],
      ["image/png", "png"],
      ["image/webp", "webp"],
      ["image/heic", "heic"],
    ] as const) {
      const resultado = validateProofFile({ type: tipo, size: 1024 });

      expect(resultado.ok).toBe(true);
      expect(resultado.ok && resultado.extension).toBe(extensao);
    }
  });

  it("is case insensitive about the type the browser reports", () => {
    expect(validateProofFile({ type: "IMAGE/JPEG", size: 1024 }).ok).toBe(true);
  });

  it("refuses anything that is not an image, including what could run", () => {
    for (const tipo of ["application/pdf", "text/html", "application/x-msdownload", ""]) {
      expect(validateProofFile({ type: tipo, size: 1024 }).ok).toBe(false);
    }
  });

  it("refuses an empty file, which is the shape a failed upload takes", () => {
    expect(validateProofFile({ type: "image/jpeg", size: 0 }).ok).toBe(false);
  });

  it("refuses a photo above the limit and says the limit in the message", () => {
    const resultado = validateProofFile({ type: "image/jpeg", size: PROOF_MAX_BYTES + 1 });

    expect(resultado.ok).toBe(false);
    expect(resultado.ok === false && resultado.reason).toMatch(/8 MB/);
  });

  it("accepts a photo exactly at the limit", () => {
    expect(validateProofFile({ type: "image/jpeg", size: PROOF_MAX_BYTES }).ok).toBe(true);
  });
});

describe("buildProofKey", () => {
  it("groups objects by company and task", () => {
    expect(buildProofKey("empresa-1", "tarefa-2", "prova-3", "jpg")).toBe(
      "empresas/empresa-1/tarefas/tarefa-2/prova-3.jpg",
    );
  });

  it("gives every proof its own key, so one never overwrites another", () => {
    const a = buildProofKey("e", "t", "prova-1", "jpg");
    const b = buildProofKey("e", "t", "prova-2", "jpg");

    expect(a).not.toBe(b);
  });
});

describe("canComplete", () => {
  it("blocks completion of a task that demands proof and has none", () => {
    expect(canComplete({ requiresProof: true }, 0)).toBe(false);
  });

  it("releases completion once a proof exists", () => {
    expect(canComplete({ requiresProof: true }, 1)).toBe(true);
  });

  it("leaves ordinary tasks exactly as they were", () => {
    expect(canComplete({ requiresProof: false }, 0)).toBe(true);
  });
});

describe("statusAfterProof", () => {
  it("sends the task to review instead of completing it", () => {
    expect(statusAfterProof("PENDING")).toBe("IN_REVIEW");
    expect(statusAfterProof("IN_PROGRESS")).toBe("IN_REVIEW");
    expect(statusAfterProof("OVERDUE")).toBe("IN_REVIEW");
  });

  it("does not reopen what is already finished or cancelled", () => {
    expect(statusAfterProof("COMPLETED")).toBe("COMPLETED");
    expect(statusAfterProof("CANCELED")).toBe("CANCELED");
  });

  it("returns the task to work when the proof is refused", () => {
    expect(statusAfterRejection()).toBe("IN_PROGRESS");
  });
});
