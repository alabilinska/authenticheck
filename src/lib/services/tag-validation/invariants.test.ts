import { describe, expect, it } from "vitest";
import type { TagEvaluation, TagObservation } from "@/types";
import { defaultKnowledge, evaluateTag } from "./evaluate";
import { documentedHardRules, v1Observation } from "./fixtures";
import { knowledgeSchema, type Knowledge } from "./schema";

// Risk #1: the risk level follows from the signals in one way for every combination and every valid
// knowledge file. Structural, so nothing here depends on knowledge.json values: the grid only feeds the
// engine, and the expectations are the aggregation rules of the document (§4) and the PRD.

type Overrides = Partial<TagObservation>;

const CLASSIC_HARDWARE = [
  "classic-flat-brass",
  "classic-pewter",
  "classic-aged-brass",
  "classic-variant-unknown",
] as const;
const ALL_HARDWARE = [...CLASSIC_HARDWARE, "giant-or-other", "unknown"] as const;

/** Grid A — dating: every letter and every value of every field that dates the tag, on the V1 plate. */
function* datingGrid(): Generator<TagObservation> {
  const letters = [...Object.keys(defaultKnowledge.seasonLetters), "X", "none", "unknown", "", "Ć"];
  for (const seasonLetter of letters)
    for (const brandLine of ["underscore", "dot", "unknown"] as const)
      for (const stamp925 of ["present", "absent", "unknown"] as const)
        for (const madeInItalySize of ["small", "large", "unknown"] as const)
          for (const hardware of CLASSIC_HARDWARE)
            for (const zipper of ["lampo", "b", "unknown"] as const)
              for (const declaredYear of [null, 2002, 2010, 2019])
                yield {
                  ...v1Observation,
                  seasonLetter,
                  brandLine,
                  stamp925,
                  madeInItalySize,
                  hardware,
                  zipper,
                  declaredYear,
                };
}

/** Plate and row-1 profiles for grid B; each one reaches a gate or a hard rule the dating grid cannot. */
const PLATE_PROFILES: Overrides[] = [
  {}, // V1
  { tagConstruction: "leather-only" }, // M-04
  { tagConstruction: "unknown" },
  { tabBackFirstNumber: "115749" }, // M-03
  { batchNumber: "0754" }, // S-12 with letter C
  { batchNumber: "123" }, // S-11
  { styleNumber: "11574", styleNumberConfirmed: true }, // M-01 (and M-03)
  { styleNumber: "11574" }, // M-01 unconfirmed → input error
  { styleNumber: "0754" }, // M-05 → input error
  { styleNumber: "123456" }, // M-02 → unsupported
];

/** Grid B — gates and row 1: plate profiles × tag photo × all hardware × visual traits × a subset of letters. */
function* gateGrid(): Generator<TagObservation> {
  for (const profile of PLATE_PROFILES)
    for (const tagPhoto of ["present", "missing"] as const)
      for (const hardware of ALL_HARDWARE)
        for (const seasonLetter of ["C", "R", "M", "A", "X", "none", "unknown", "Ć"])
          for (const thread of ["yes", "no", "unknown"] as const)
            for (const bales of ["yes", "no", "unknown"] as const)
              yield { ...v1Observation, ...profile, tagPhoto, hardware, seasonLetter, thread, bales };
}

function* fullGrid(): Generator<TagObservation> {
  yield* datingGrid();
  yield* gateGrid();
}

/** Aggregation rules broken by one result (rules §4, PRD risk levels); empty when it is consistent. */
function broken(e: TagEvaluation): string[] {
  const hard = e.hardSignals.length;
  const soft = e.softSignals.length;
  const problems: string[] = [];
  if (hard > 0 && (e.outcome !== "risk" || e.riskLevel !== "high")) problems.push("hard signal without high risk");
  if (e.riskLevel === "low" && hard + soft > 0) problems.push("low risk with signals");
  // M-02 is a soft signal on the unsupported outcome (X3), so "soft only ⇒ medium" holds on the risk path.
  if (e.outcome === "risk" && soft > 0 && hard === 0 && e.riskLevel !== "medium") {
    problems.push("soft signals only, but not medium");
  }
  if ((e.riskLevel !== null) !== (e.outcome === "risk")) problems.push("risk level present without a risk outcome");
  if (e.outcome !== "risk" && hard > 0) problems.push("hard signal on a no-verdict outcome");
  return problems;
}

interface GridRun {
  checked: number;
  violations: string[];
  hardFired: Set<string>;
  outcomes: Set<string>;
  riskLevels: Set<string>;
}

function runGrid(observations: Iterable<TagObservation>, knowledge: Knowledge): GridRun {
  const run: GridRun = { checked: 0, violations: [], hardFired: new Set(), outcomes: new Set(), riskLevels: new Set() };
  for (const obs of observations) {
    const e = evaluateTag(obs, knowledge);
    run.checked++;
    for (const signal of e.hardSignals) run.hardFired.add(signal.ruleId);
    run.outcomes.add(e.outcome);
    run.riskLevels.add(String(e.riskLevel));
    const problems = broken(e);
    // A handful of examples is enough to debug; thousands would drown the report.
    if (problems.length > 0 && run.violations.length < 5) {
      const fired = `hard=[${e.hardSignals.map((s) => s.ruleId).join(",")}] soft=[${e.softSignals.map((s) => s.ruleId).join(",")}]`;
      run.violations.push(
        `${problems.join("; ")} — ${e.outcome}/${String(e.riskLevel)} ${fired} for ${JSON.stringify(obs)}`,
      );
    }
  }
  return run;
}

let defaultRun: GridRun | undefined;
const runOnKnowledgeFile = (): GridRun => (defaultRun ??= runGrid(fullGrid(), defaultKnowledge));

/** A changed but valid knowledge file, as after a rules update. */
function changedKnowledge(edit: (knowledge: Knowledge) => void): Knowledge {
  const knowledge = structuredClone(defaultKnowledge);
  edit(knowledge);
  return knowledgeSchema.parse(knowledge);
}

const CHANGED_KNOWLEDGE: [string, Knowledge][] = [
  [
    "every tolerance 0, zipper change moved to 2010/2011",
    changedKnowledge((knowledge) => {
      for (const rule of knowledge.rules) {
        if ("toleranceYears" in rule) rule.toleranceYears = 0;
        if (rule.kind === "zipperEra") {
          rule.periods.lampo.to = 2010;
          rule.periods.b.from = 2011;
        }
      }
    }),
  ],
  [
    "every tolerance 3, aged brass from 2006",
    changedKnowledge((knowledge) => {
      for (const rule of knowledge.rules) if ("toleranceYears" in rule) rule.toleranceYears = 3;
      knowledge.hardwareEras["classic-aged-brass"].from = 2006;
    }),
  ],
];

describe("invariant: a hard signal always means high risk (risk #1)", () => {
  it("holds for every combination of the grid on the knowledge file", () => {
    const { checked, violations } = runOnKnowledgeFile();
    expect(checked).toBeGreaterThan(40_000);
    expect(violations).toEqual([]);
  });

  it("is not vacuous: the grid fires every documented hard rule and reaches every outcome and level", () => {
    const { hardFired, outcomes, riskLevels } = runOnKnowledgeFile();
    expect([...hardFired].sort()).toEqual(documentedHardRules);
    expect([...outcomes].sort()).toEqual(["input-error", "risk", "scope-unknown", "unsupported"]);
    expect([...riskLevels].sort()).toEqual(["high", "low", "medium", "null"]);
  });

  it.each(CHANGED_KNOWLEDGE)("holds on changed knowledge: %s", (_name, knowledge) => {
    expect(runGrid(fullGrid(), knowledge).violations).toEqual([]);
  });
});

// Seller questions, verbatim from rules §8.
const QUESTION = {
  tagPhoto: "Poproszę o zdjęcie metki w środku torebki — z przodu i z odwrotu, tak żeby numery były ostre.", // :326
  tabBack: "Poproszę o zdjęcie odwrotu skórzanej metki, z numerami i napisem MADE IN ITALY.", // :327
  zipper: "Poproszę o zdjęcie spodu suwaka, od strony, która normalnie przylega do torebki.", // :330
  tagStitching: "Poproszę o zbliżenie górnej krawędzi metki, tam gdzie jest przyszyta do podszewki.", // :331
  bales: "Poproszę o zdjęcie kółka przy mocowaniu paska, z boku.", // :332
};

/** Every field the wizard lets the buyer answer with "Nie widać"; the style number has no such option. */
const CANT_SEE: Overrides = {
  tagConstruction: "unknown",
  batchNumber: "unknown",
  tabBackFirstNumber: "unknown",
  brandLine: "unknown",
  stamp925: "unknown",
  madeInItalySize: "unknown",
  thread: "unknown",
  zipper: "unknown",
  bales: "unknown",
  declaredYear: null,
};

const sorted = (values: string[]): string[] => [...values].sort();

// PRODUCT DECISION, documented here, not a target: "can't see" never adds a signal, so a bag read with
// almost no data gets low risk with zero signals, and a seller question for every gap instead.
// The PRD is inconsistent on it: prd.md:110 "low = everything checked and consistent" (and "Can't see …
// does not lower the level but becomes a question") vs prd.md:35 "no warning signs were found in the
// checked traits". Engine contract: archive tag-validation-first-result/plan.md:46 "a rule whose input is
// unknown abstains … it never fails". Changing this starts with the PRD and the rules document (§4).
// What these tests guard: missing data never creates a signal, and it always creates a question.
describe("product decision: “can't see” on many fields gives low risk without signals, plus questions", () => {
  it("no letter + flat brass, everything else can't be seen", () => {
    const e = evaluateTag({ ...v1Observation, ...CANT_SEE, seasonLetter: "none", hardware: "classic-flat-brass" });
    expect(e.outcome).toBe("risk");
    expect(e.riskLevel).toBe("low");
    expect([...e.hardSignals, ...e.softSignals]).toEqual([]);
    expect(e.year).toEqual({ status: "no-letter" });
    expect(sorted(e.abstained)).toEqual([
      "M-03",
      "M-04",
      "S-01",
      "S-02",
      "S-03",
      "S-04",
      "S-05",
      "S-06",
      "S-08",
      "S-09",
      "S-10",
      "S-11",
      "S-12",
      "S-13",
      "V-01",
      "V-02",
      "V-03",
    ]);
    expect(sorted(e.sellerQuestions)).toEqual(
      sorted([QUESTION.tagPhoto, QUESTION.tabBack, QUESTION.tagStitching, QUESTION.bales, QUESTION.zipper]),
    );
  });

  it("letter C, everything else can't be seen → year ambiguous", () => {
    const e = evaluateTag({ ...v1Observation, ...CANT_SEE, seasonLetter: "C", hardware: "classic-variant-unknown" });
    expect(e.outcome).toBe("risk");
    expect(e.riskLevel).toBe("low");
    expect([...e.hardSignals, ...e.softSignals]).toEqual([]);
    expect(e.year).toEqual({
      status: "ambiguous",
      readings: [
        { season: "S/S", year: 2004 },
        { season: "F/W", year: 2016 },
      ],
    });
    expect(sorted(e.abstained)).toEqual([
      "M-03",
      "M-04",
      "S-04",
      "S-05",
      "S-06",
      "S-07",
      "S-08",
      "S-09",
      "S-10",
      "S-11",
      "S-12",
      "S-13",
      "V-01",
      "V-02",
      "V-03",
    ]);
    expect(sorted(e.sellerQuestions)).toEqual(
      sorted([QUESTION.tagPhoto, QUESTION.tabBack, QUESTION.tagStitching, QUESTION.bales, QUESTION.zipper]),
    );
  });

  it("S + dot + no 925, MADE IN ITALY can't be seen → ambiguous; S-07, S-08 and V-02 abstain even against a claim of 2015", () => {
    // Rules §3.5 :216-218 "If no resolver applies, keep both readings and mark the year ambiguous; S-07 and
    // S-08 then abstain". The seller's 2015 is off from both readings (2008, 2021) and still asks nothing.
    const e = evaluateTag({ ...v1Observation, seasonLetter: "S", madeInItalySize: "unknown", declaredYear: 2015 });
    expect(e.outcome).toBe("risk");
    expect(e.riskLevel).toBe("low");
    expect([...e.hardSignals, ...e.softSignals]).toEqual([]);
    expect(e.year).toEqual({
      status: "ambiguous",
      readings: [
        { season: "F/W", year: 2008 },
        { season: null, year: 2021 },
      ],
    });
    expect(sorted(e.abstained)).toEqual(["S-04", "S-07", "S-08", "S-09", "S-10", "S-13", "V-02"]);
    expect(e.sellerQuestions).toEqual([QUESTION.tabBack]);
  });
});
