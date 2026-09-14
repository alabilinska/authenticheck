import { z } from "astro/zod";
import { evaluateTag } from "@/lib/services/tag-validation/evaluate";
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
