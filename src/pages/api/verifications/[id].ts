import type { APIRoute } from "astro";
import { z } from "astro/zod";
import { apiError, json } from "@/lib/api";
import { parseRow, toDto } from "@/lib/services/verifications";
import { createClient } from "@/lib/supabase";

/** GET /api/verifications/[id] — one of the user's saved verifications, evaluation recomputed. */
export const GET: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user) return apiError(401, "UNAUTHENTICATED", "Zaloguj się, żeby zobaczyć weryfikację.");
  const supabase = createClient(context.request.headers, context.cookies);
  if (!supabase) return apiError(503, "SERVICE_UNAVAILABLE", "Baza danych nie jest skonfigurowana.");

  const id = z.uuid().safeParse(context.params.id);
  if (!id.success) return apiError(404, "NOT_FOUND", "Nie ma takiej weryfikacji.");

  // The Supabase client is untyped (no generated Database types): rows are parsed, never trusted.
  const { data, error }: { data: unknown; error: unknown } = await supabase
    .from("verifications")
    .select("*")
    .eq("id", id.data)
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return apiError(500, "DATABASE_ERROR", "Nie udało się wczytać weryfikacji.");
  if (data === null) return apiError(404, "NOT_FOUND", "Nie ma takiej weryfikacji.");

  return json({ verification: toDto(parseRow(data)) });
};
