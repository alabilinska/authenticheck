import { defaultKnowledge } from "@/lib/services/tag-validation/evaluate";
import type { RuleId, TagEvaluation, YearStatus } from "@/types";

// Rules that compare something with the tag year (S-07 hardware, S-08 seller's year, V-02 zipper).
const YEAR_DEPENDENT_KINDS = new Set(["hardwareEra", "declaredYear", "zipperEra"]);
const yearDependentIds = new Set(
  defaultKnowledge.rules.filter((rule) => YEAR_DEPENDENT_KINDS.has(rule.kind)).map((rule) => rule.id),
);

/** FR-007: checks that abstained because the year is unresolved are listed apart from the rest. */
export function splitAbstained(abstained: RuleId[], year: YearStatus): { yearUnresolved: RuleId[]; other: RuleId[] } {
  const unique = [...new Set(abstained)];
  if (year.status !== "ambiguous") return { yearUnresolved: [], other: unique };
  return {
    yearUnresolved: unique.filter((id) => yearDependentIds.has(id)),
    other: unique.filter((id) => !yearDependentIds.has(id)),
  };
}

/** FR-008: a message ready to paste into the marketplace chat; empty when there is nothing to ask. */
export function sellerMessage(questions: string[], listingUrl: string): string {
  if (questions.length === 0) return "";
  return [
    "Dzień dobry,",
    `mam kilka pytań o torebkę z ogłoszenia ${listingUrl}:`,
    "",
    ...questions.map((question, index) => `${String(index + 1)}. ${question}`),
    "",
    "Dziękuję!",
  ].join("\n");
}

/**
 * Short label for a verification's result, used on the list of saved verifications.
 * Fails closed: only an explicit "low" reads as low risk; a result without a level never does.
 */
export function outcomeLabel(outcome: TagEvaluation["outcome"], riskLevel: TagEvaluation["riskLevel"]): string {
  if (outcome === "unsupported") return "Nieobsługiwany wariant";
  if (outcome === "scope-unknown") return "Brak danych o okuciach";
  if (outcome === "input-error") return "Błąd odczytu metki";
  if (riskLevel === "high") return "Wysokie ryzyko";
  if (riskLevel === "medium") return "Średnie ryzyko";
  if (riskLevel === "low") return "Niskie ryzyko";
  return "Brak oceny ryzyka";
}

function field(value: unknown, key: string): unknown {
  return typeof value === "object" && value !== null && key in value
    ? (value as Record<string, unknown>)[key]
    : undefined;
}

/** The id from a `201 { verification }` response, or null when the body has another shape. */
export function savedVerificationId(body: unknown): string | null {
  const id = field(field(body, "verification"), "id");
  return typeof id === "string" ? id : null;
}

/** The message from a `{ error: { code, message } }` response, with a fallback. */
export function apiErrorMessage(
  body: unknown,
  fallback = "Nie udało się zapisać weryfikacji. Spróbuj ponownie.",
): string {
  const message = field(field(body, "error"), "message");
  return typeof message === "string" ? message : fallback;
}
