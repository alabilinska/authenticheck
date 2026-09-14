import type { z } from "astro/zod";

/** JSON responses for API routes; errors follow CLAUDE.md: `{ error: { code, message, context? } }`. */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export function apiError(status: number, code: string, message: string, context?: unknown): Response {
  return json({ error: context === undefined ? { code, message } : { code, message, context } }, status);
}

/** Reads a JSON body; `ok: false` when it is not valid JSON. */
export async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false }> {
  try {
    return { ok: true, value: await request.json() };
  } catch {
    return { ok: false };
  }
}

/** 400 INVALID_INPUT with the zod issues inside `context` (CLAUDE.md error format). */
export function invalidInput(error: z.ZodError, message = "Dane weryfikacji są niepoprawne."): Response {
  return apiError(400, "INVALID_INPUT", message, {
    issues: error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
  });
}
