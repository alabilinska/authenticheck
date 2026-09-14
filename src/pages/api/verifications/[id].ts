import type { APIRoute } from "astro";
import { apiError, json } from "@/lib/api";
import { getVerification } from "@/lib/services/verifications";
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
