import type { APIRoute } from "astro";
import { apiError, invalidInput, json, readJson } from "@/lib/api";
import {
  deleteVerification,
  getVerification,
  saveVerificationSchema,
  updateVerification,
} from "@/lib/services/verifications";
import { createClient } from "@/lib/supabase";

/** GET /api/verifications/[id] — one of the user's saved verifications, evaluation recomputed. */
export const GET: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) return apiError(401, "UNAUTHENTICATED", "Zaloguj się, żeby zobaczyć weryfikację.");
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) return apiError(503, "SERVICE_UNAVAILABLE", "Baza danych nie jest skonfigurowana.");

  const result = await getVerification(supabase, user.id, context.params.id);
  if (!result.ok) return apiError(500, "DATABASE_ERROR", "Nie udało się wczytać weryfikacji.");
  if (result.value === null) return apiError(404, "NOT_FOUND", "Nie ma takiej weryfikacji.");
  return json({ verification: result.value });
};

/** PUT /api/verifications/[id] — S-06: replaces the answers; the server recomputes the evaluation. */
export const PUT: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) return apiError(401, "UNAUTHENTICATED", "Zaloguj się, żeby zmienić weryfikację.");
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) return apiError(503, "SERVICE_UNAVAILABLE", "Baza danych nie jest skonfigurowana.");

  const body = await readJson(context.request);
  if (!body.ok) return apiError(400, "INVALID_INPUT", "Treść żądania musi być poprawnym JSON-em.");
  const parsed = saveVerificationSchema.safeParse(body.value);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await updateVerification(supabase, user.id, context.params.id, parsed.data);
  if (!result.ok) return apiError(500, "DATABASE_ERROR", "Nie udało się zapisać zmian.");
  if (result.value === null) return apiError(404, "NOT_FOUND", "Nie ma takiej weryfikacji.");
  return json({ verification: result.value });
};

/** DELETE /api/verifications/[id] — S-07: removes one of the user's verifications. */
export const DELETE: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) return apiError(401, "UNAUTHENTICATED", "Zaloguj się, żeby usunąć weryfikację.");
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) return apiError(503, "SERVICE_UNAVAILABLE", "Baza danych nie jest skonfigurowana.");

  const result = await deleteVerification(supabase, user.id, context.params.id);
  if (!result.ok) return apiError(500, "DATABASE_ERROR", "Nie udało się usunąć weryfikacji.");
  if (!result.value) return apiError(404, "NOT_FOUND", "Nie ma takiej weryfikacji.");
  return new Response(null, { status: 204 });
};
