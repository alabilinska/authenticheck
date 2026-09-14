/** JSON responses for API routes; errors follow CLAUDE.md: `{ error: { code, message, context? } }`. */
export function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

export function apiError(status: number, code: string, message: string, context?: unknown): Response {
  return json({ error: context === undefined ? { code, message } : { code, message, context } }, status);
}
