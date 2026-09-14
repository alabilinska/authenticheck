import { z } from "astro/zod";
import { evaluateTag } from "@/lib/services/tag-validation/evaluate";
import type { createClient } from "@/lib/supabase";
import type {
  SaveVerificationCommand,
  TagEvaluation,
  TagObservation,
  VerificationDto,
  VerificationListItem,
} from "@/types";

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

export const tagObservationSchema: z.ZodType<TagObservation> = z.object({
  tagPhoto: z.enum(["present", "missing"]),
  hardware: z.enum([
    "classic-flat-brass",
    "classic-pewter",
    "classic-aged-brass",
    "classic-variant-unknown",
    "giant-or-other",
    "unknown",
  ]),
  tagConstruction: z.enum(["metal-plate", "leather-only", "unknown"]),
  styleNumber: z.string().max(40),
  styleNumberConfirmed: z.boolean(),
  batchNumber: z.string().max(40),
  seasonLetter: z.string().max(10),
  tabBackFirstNumber: z.string().max(80),
  brandLine: z.enum(["underscore", "dot", "unknown"]),
  stamp925: z.enum(["present", "absent", "unknown"]),
  madeInItalySize: z.enum(["small", "large", "unknown"]),
  declaredYear: z.number().int().min(1900).max(2100).nullable(),
  thread: z.enum(["yes", "no", "unknown"]),
  zipper: z.enum(["lampo", "b", "unknown"]),
  bales: z.enum(["yes", "no", "unknown"]),
});

export const saveVerificationSchema: z.ZodType<SaveVerificationCommand> = z.object({
  listingUrl: z.string().trim().max(2000).refine(isHttpUrl, { error: "Podaj link do ogłoszenia (http lub https)." }),
  declaredYear: z.number().int().min(1900).max(2100).nullable(),
  price: z.number().nonnegative().max(10_000_000).nullable(),
  observation: tagObservationSchema,
});

/** A `public.verifications` row as returned by the Data API (the client is untyped, so rows are parsed). */
const rowSchema = z.object({
  id: z.string(),
  listing_url: z.string(),
  declared_year: z.number().nullable(),
  price: z.coerce.number().nullable(),
  observation: tagObservationSchema,
  outcome: z.enum(["risk", "unsupported", "scope-unknown", "input-error"]),
  risk_level: z.enum(["low", "medium", "high"]).nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});

export type VerificationRow = z.infer<typeof rowSchema>;

export function parseRow(value: unknown): VerificationRow {
  return rowSchema.parse(value);
}

/** Columns written on insert; `user_id` defaults to `auth.uid()` and RLS checks it. */
export function toInsertRow(command: SaveVerificationCommand, evaluation: TagEvaluation) {
  return {
    listing_url: command.listingUrl,
    declared_year: command.declaredYear,
    price: command.price,
    observation: command.observation,
    outcome: evaluation.outcome,
    risk_level: evaluation.riskLevel,
  };
}

/** S-06: columns written on update — the whole command is replaced and the evaluation recomputed. */
export function toUpdateRow(command: SaveVerificationCommand, evaluation: TagEvaluation, now: Date) {
  return { ...toInsertRow(command, evaluation), updated_at: now.toISOString() };
}

export function toListItem(row: VerificationRow): VerificationListItem {
  return {
    id: row.id,
    listingUrl: row.listing_url,
    declaredYear: row.declared_year,
    outcome: row.outcome,
    riskLevel: row.risk_level,
    createdAt: row.created_at,
  };
}

/** The evaluation is recomputed, so a saved verification always reflects the current rules. */
export function toDto(row: VerificationRow): VerificationDto {
  return {
    ...toListItem(row),
    price: row.price,
    observation: row.observation,
    evaluation: evaluateTag(row.observation),
    updatedAt: row.updated_at,
  };
}

type SupabaseClient = NonNullable<ReturnType<typeof createClient>>;

/** Result of a database call: `ok: false` means the Data API returned an error. */
export type StoreResult<T> = { ok: true; value: T } | { ok: false };

// The Supabase client is untyped (no generated Database types): rows are parsed, never trusted.

/** The user's saved verifications, newest first (RLS limits rows to the owner; the filter keeps it explicit). */
export async function listVerifications(
  supabase: SupabaseClient,
  userId: string,
): Promise<StoreResult<VerificationListItem[]>> {
  const { data, error }: { data: unknown; error: unknown } = await supabase
    .from("verifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) return { ok: false };
  return { ok: true, value: z.array(z.unknown()).parse(data).map(parseRow).map(toListItem) };
}

/** One saved verification of the user; `value: null` when the id is malformed, absent or someone else's. */
export async function getVerification(
  supabase: SupabaseClient,
  userId: string,
  id: string | undefined,
): Promise<StoreResult<VerificationDto | null>> {
  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) return { ok: true, value: null };
  const { data, error }: { data: unknown; error: unknown } = await supabase
    .from("verifications")
    .select("*")
    .eq("id", parsedId.data)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return { ok: false };
  return { ok: true, value: data === null ? null : toDto(parseRow(data)) };
}

/** Saves a validated command; the evaluation is computed here, never taken from the client. */
export async function saveVerification(
  supabase: SupabaseClient,
  command: SaveVerificationCommand,
): Promise<StoreResult<VerificationDto>> {
  const { data, error }: { data: unknown; error: unknown } = await supabase
    .from("verifications")
    .insert(toInsertRow(command, evaluateTag(command.observation)))
    .select("*")
    .single();
  if (error) return { ok: false };
  return { ok: true, value: toDto(parseRow(data)) };
}

/** S-06: replaces the answers of one of the user's verifications; `value: null` when it is not theirs or absent. */
export async function updateVerification(
  supabase: SupabaseClient,
  userId: string,
  id: string | undefined,
  command: SaveVerificationCommand,
): Promise<StoreResult<VerificationDto | null>> {
  const parsedId = z.uuid().safeParse(id);
  if (!parsedId.success) return { ok: true, value: null };
  const { data, error }: { data: unknown; error: unknown } = await supabase
    .from("verifications")
    .update(toUpdateRow(command, evaluateTag(command.observation), new Date()))
    .eq("id", parsedId.data)
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
  if (error) return { ok: false };
  return { ok: true, value: data === null ? null : toDto(parseRow(data)) };
}
