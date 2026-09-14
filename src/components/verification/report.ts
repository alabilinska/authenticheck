import { defaultKnowledge } from "@/lib/services/tag-validation/evaluate";
import type { RuleId, YearStatus } from "@/types";

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
