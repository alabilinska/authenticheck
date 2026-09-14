import type { APIRoute } from "astro";
import { apiError, invalidInput, json, readJson } from "@/lib/api";
import { listVerifications, saveVerification, saveVerificationSchema } from "@/lib/services/verifications";
import { createClient } from "@/lib/supabase";

/** GET /api/verifications — the signed-in user's saved verifications, newest first. */
export const GET: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) return apiError(401, "UNAUTHENTICATED", "Zaloguj się, żeby zobaczyć swoje weryfikacje.");
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) return apiError(503, "SERVICE_UNAVAILABLE", "Baza danych nie jest skonfigurowana.");

  const result = await listVerifications(supabase, user.id);
  if (!result.ok) return apiError(500, "DATABASE_ERROR", "Nie udało się wczytać weryfikacji.");
  return json({ verifications: result.value });
};

/** POST /api/verifications — saves a verification; the server evaluates it. */
export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) return apiError(401, "UNAUTHENTICATED", "Zaloguj się, żeby zapisać weryfikację.");
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) return apiError(503, "SERVICE_UNAVAILABLE", "Baza danych nie jest skonfigurowana.");

  const body = await readJson(context.request);
  if (!body.ok) return apiError(400, "INVALID_INPUT", "Treść żądania musi być poprawnym JSON-em.");
  const parsed = saveVerificationSchema.safeParse(body.value);
  if (!parsed.success) return invalidInput(parsed.error);

  const result = await saveVerification(supabase, parsed.data);
  if (!result.ok) return apiError(500, "DATABASE_ERROR", "Nie udało się zapisać weryfikacji.");
  return json({ verification: result.value }, 201);
};
