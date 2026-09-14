// Contract of the tag-validation engine (context/changes/tag-validation-first-result/plan.md).
// Shared by the engine, its tests and the verification wizard.

type Unknown = "unknown"; // FR-004 "nie widać" / illegible

export type HardwareObservation =
  | "classic-flat-brass"
  | "classic-pewter"
  | "classic-aged-brass"
  | "classic-variant-unknown"
  | "giant-or-other"
  | Unknown;

export interface TagObservation {
  tagPhoto: "present" | "missing";
  hardware: HardwareObservation;
  tagConstruction: "metal-plate" | "leather-only" | Unknown;
  /** Bottom plate line, as typed. */
  styleNumber: string;
  /** The buyer confirmed an odd-length style number (M-01). */
  styleNumberConfirmed: boolean;
  /** Digits after "N°"; the prefix may be typed. */
  batchNumber: string;
  /** Season letter as typed; "none" = the plate has no letter; "unknown" = illegible. */
  seasonLetter: string;
  /** First number on the back of the leather tab, or the whole typed string; "unknown" = can't see. */
  tabBackFirstNumber: string;
  brandLine: "underscore" | "dot" | Unknown;
  stamp925: "present" | "absent" | Unknown;
  madeInItalySize: "small" | "large" | Unknown;
  /** Year the seller claims, from the start card; optional. */
  declaredYear: number | null;
}

/** "M-01" … "S-13", as in balenciaga-city-tag-rules.md. */
export type RuleId = string;

export interface RuleSignal {
  ruleId: RuleId;
  severity: "hard" | "soft";
  confidence: "confirmed" | "probable";
  message: string;
}

export interface InputError {
  ruleId: RuleId;
  field: keyof TagObservation;
  message: string;
  needsConfirmation: boolean;
}

export interface YearReading {
  season: "S/S" | "F/W" | null;
  year: number;
}

export type YearStatus =
  | { status: "resolved"; reading: YearReading; resolvedBy: RuleId | null }
  | { status: "ambiguous"; readings: YearReading[] }
  | { status: "no-letter" }
  | { status: "unknown" };

export interface TagEvaluation {
  outcome: "risk" | "unsupported" | "scope-unknown" | "input-error";
  /** Non-null only when outcome === "risk". */
  riskLevel: "low" | "medium" | "high" | null;
  year: YearStatus;
  hardSignals: RuleSignal[];
  softSignals: RuleSignal[];
  passed: RuleId[];
  abstained: RuleId[];
  inputErrors: InputError[];
  /** Polish copy from rules §8, filled and deduplicated. */
  sellerQuestions: string[];
}
