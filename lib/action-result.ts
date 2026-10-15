export type ActionResult<T = undefined> = T extends undefined
  ? { ok: true; message?: string } | { ok: false; error: string }
  : { ok: true; data: T; message?: string } | { ok: false; error: string };

export function actionError(error: unknown, fallback = "Não foi possível concluir a ação.") {
  if (error instanceof Error) {
    return { ok: false, error: error.message } as const;
  }

  return { ok: false, error: fallback } as const;
}
