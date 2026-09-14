import { describe, expect, it } from "vitest";
import type { TagEvaluation, TagObservation } from "@/types";
import { outcomeLabel } from "@/components/verification/report";
import { defaultKnowledge, evaluateTag } from "@/lib/services/tag-validation/evaluate";
import { knowledgeSchema, type Knowledge, type RuleDef } from "@/lib/services/tag-validation/schema";
import {
  parseRow,
  saveVerificationSchema,
  toDto,
  toInsertRow,
  toListItem,
  toUpdateRow,
  type VerificationRow,
} from "./verifications";

// Rules test case V1 with the visual checks answered: low risk, S/S 2009.
const v1: TagObservation = {
  tagPhoto: "present",
  hardware: "classic-aged-brass",
  tagConstruction: "metal-plate",
  styleNumber: "115748",
  styleNumberConfirmed: false,
  batchNumber: "4892",
  seasonLetter: "R",
  tabBackFirstNumber: "115748",
  brandLine: "dot",
  stamp925: "absent",
  madeInItalySize: "small",
  declaredYear: null,
  thread: "yes",
  zipper: "lampo",
  bales: "yes",
};

const command = { listingUrl: "https://example.com/oferta/1", declaredYear: 2009, price: 3200, observation: v1 };

const row = {
  id: "0b8d2a4e-0000-4000-8000-000000000001",
  listing_url: command.listingUrl,
  declared_year: 2009,
  price: "3200.00",
  observation: v1,
  outcome: "risk",
  risk_level: "low",
  created_at: "2026-09-14T12:00:00+00:00",
  updated_at: "2026-09-14T12:00:00+00:00",
};

describe("saveVerificationSchema", () => {
  it("accepts a complete command", () => {
    expect(saveVerificationSchema.safeParse(command).success).toBe(true);
  });

  it("rejects a listing link that is not http(s)", () => {
    const result = saveVerificationSchema.safeParse({ ...command, listingUrl: "javascript:alert(1)" });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown answer in the observation", () => {
    const result = saveVerificationSchema.safeParse({ ...command, observation: { ...v1, zipper: "gold" } });
    expect(result.success).toBe(false);
  });

  it("rejects a command without the observation", () => {
    const { observation: _omitted, ...rest } = command;
    expect(saveVerificationSchema.safeParse(rest).success).toBe(false);
  });

  // LUKA (risk #2): the API takes any season letter up to 10 characters, so a client other than the wizard
  // can save a false "high risk" (S-01, rules §3.4 :182). Not tightened in phase 1: the same
  // tagObservationSchema parses stored rows, and the wizard saves the letter without trim(), so a stricter
  // letter format could make old rows fail to parse — and one bad row fails the whole list.
  it("LUKA: accepts a malformed season letter, which the engine turns into hard S-01", () => {
    for (const seasonLetter of ["Ć", ""]) {
      const result = saveVerificationSchema.safeParse({ ...command, observation: { ...v1, seasonLetter } });
      expect(result.success, JSON.stringify(seasonLetter)).toBe(true);
      if (!result.success) continue;
      expect(evaluateTag(result.data.observation).hardSignals.map((s) => s.ruleId)).toEqual(["S-01"]);
    }
  });
});

describe("row mapping", () => {
  it("stores the outcome and risk level of the evaluation", () => {
    const insert = toInsertRow(command, evaluateTag(v1));
    expect(insert).toMatchObject({ outcome: "risk", risk_level: "low", listing_url: command.listingUrl });
  });

  it("parses a Data API row, coercing numeric price", () => {
    expect(parseRow(row).price).toBe(3200);
  });

  it("maps a row to a list item", () => {
    expect(toListItem(parseRow(row))).toEqual({
      id: row.id,
      listingUrl: row.listing_url,
      declaredYear: 2009,
      outcome: "risk",
      riskLevel: "low",
      createdAt: row.created_at,
    });
  });

  it("recomputes the evaluation for the full view", () => {
    const dto = toDto(parseRow(row));
    expect(dto.evaluation.riskLevel).toBe("low");
    expect(dto.evaluation.year).toEqual({
      status: "resolved",
      reading: { season: "S/S", year: 2009 },
      resolvedBy: "S-13",
    });
  });
});

describe("update row (S-06)", () => {
  it("recomputes the outcome and risk level and stamps updated_at", () => {
    const changed = { ...command, observation: { ...v1, zipper: "b" as const } };
    const now = new Date("2026-09-14T15:00:00Z");
    const update = toUpdateRow(changed, evaluateTag(changed.observation), now);
    expect(update).toMatchObject({ outcome: "risk", risk_level: "high", updated_at: "2026-09-14T15:00:00.000Z" });
  });
});

// Risk #5: the list label comes from the stored `outcome` / `risk_level` columns (toListItem), the report
// recomputes the evaluation from the stored observation (toDto). The two reading paths are compared
// here for the same row — never the stored value with itself.

/** A row as the Data API returns it after POST: columns from `evaluation`, then parsed like any read. */
function savedRow(observation: TagObservation, evaluation: TagEvaluation = evaluateTag(observation)): VerificationRow {
  return parseRow({
    id: row.id,
    ...toInsertRow({ ...command, observation }, evaluation),
    created_at: row.created_at,
    updated_at: row.updated_at,
  });
}

interface Verdict {
  outcome: TagEvaluation["outcome"];
  riskLevel: TagEvaluation["riskLevel"];
  label: string;
}

const verdict = (outcome: Verdict["outcome"], riskLevel: Verdict["riskLevel"]): Verdict => ({
  outcome,
  riskLevel,
  label: outcomeLabel(outcome, riskLevel),
});
const listVerdict = (r: VerificationRow): Verdict => verdict(toListItem(r).outcome, toListItem(r).riskLevel);
const reportVerdict = (r: VerificationRow): Verdict => {
  const { evaluation } = toDto(r);
  return verdict(evaluation.outcome, evaluation.riskLevel);
};

describe("list = report (#5)", () => {
  const cases: [string, TagObservation, Verdict["outcome"], Verdict["riskLevel"]][] = [
    ["V1", v1, "risk", "low"],
    ["seam not black (V-01)", { ...v1, thread: "no" }, "risk", "medium"],
    ["no tag photo (medium without signals)", { ...v1, tagPhoto: "missing" }, "risk", "medium"],
    ["X7 letter X", { ...v1, seasonLetter: "X" }, "risk", "high"],
    ["X3 other six digits", { ...v1, styleNumber: "123456" }, "unsupported", null],
    ["X1 unconfirmed", { ...v1, styleNumber: "11574" }, "input-error", null],
    ["hardware can't be seen", { ...v1, hardware: "unknown" }, "scope-unknown", null],
  ];
  for (const [name, observation, outcome, riskLevel] of cases) {
    it(`${name}: the list shows the report's verdict (${outcome}/${String(riskLevel)})`, () => {
      const saved = savedRow(observation);
      // The case really produces the verdict it is named after, so the table covers every outcome.
      expect(reportVerdict(saved)).toEqual(verdict(outcome, riskLevel));
      expect(listVerdict(saved)).toEqual(reportVerdict(saved));
    });
  }

  it("after an edit (S-06) the list shows the new verdict, like the report", () => {
    const before = savedRow(v1);
    const changed = { ...command, observation: { ...v1, zipper: "b" as const } };
    const edited = parseRow({
      ...before,
      ...toUpdateRow(changed, evaluateTag(changed.observation), new Date("2026-09-14T15:00:00Z")),
    });
    expect(listVerdict(edited)).toEqual(reportVerdict(edited));
    // The edit did change the verdict, so the equality above is not the old row compared with itself.
    expect(listVerdict(edited)).not.toEqual(listVerdict(before));
  });
});

/** The knowledge file as it was before a rules update that moved the start of the B zipper period. */
function knowledgeWithBZipperFrom(year: number): Knowledge {
  const knowledge = structuredClone(defaultKnowledge);
  const zipper = knowledge.rules.find(
    (rule): rule is Extract<RuleDef, { kind: "zipperEra" }> => rule.kind === "zipperEra",
  );
  if (zipper === undefined) throw new Error("knowledge.json has no zipperEra rule");
  zipper.periods.b.from = year;
  return knowledgeSchema.parse(knowledge);
}

// Known bug, fixed in lesson 5: the stored columns do not know which rules produced them, and nothing
// recomputes them when the rules change (migration 20260914130000_create_verifications.sql: "Denormalised
// from the evaluation at save time, so the list needs no recomputation"). After a rules update the list keeps
// the old label while the report shows the new verdict — and the DTO of GET /api/verifications/[id] carries
// both at once (`riskLevel` stored, `evaluation.riskLevel` fresh).
// Proposed fix: the list recomputes the verdict from `observation` (the engine is pure and one user's list
// is small); the columns may stay for sorting and filtering. That also removes the contradiction in the DTO.
describe("list = report after a rules change (#5)", () => {
  const RULE_CHANGES: {
    name: string;
    observation: TagObservation;
    old: Knowledge;
    saved: "low" | "high";
    now: "low" | "high";
  }[] = [
    {
      // V1 with a B pull, dated S/S 2009.
      name: "tightened — B pulls were allowed from 2008, now from 2015",
      observation: { ...v1, zipper: "b" },
      old: knowledgeWithBZipperFrom(2008),
      saved: "low",
      now: "high",
    },
    {
      // V4 of the rules document: D + dot brand line → S/S 2016, with a B pull.
      name: "loosened — B pulls were allowed only from 2020, now from 2015",
      observation: { ...v1, batchNumber: "2048", seasonLetter: "D", madeInItalySize: "unknown", zipper: "b" },
      old: knowledgeWithBZipperFrom(2020),
      saved: "high",
      now: "low",
    },
  ];

  for (const change of RULE_CHANGES) {
    it(`precondition (${change.name}): the old rules gave ${change.saved}, the current give ${change.now}, and the row parses`, () => {
      // Keeps the it.fails below honest: a broken setup cannot make it "pass" by throwing.
      expect(evaluateTag(change.observation, change.old).riskLevel).toBe(change.saved);
      expect(evaluateTag(change.observation).riskLevel).toBe(change.now);
      expect(savedRow(change.observation, evaluateTag(change.observation, change.old)).risk_level).toBe(change.saved);
    });

    it.fails(
      `BŁĄD (lekcja 5), ${change.name}: a row saved under the old rules shows the report's verdict on the list and in its DTO`,
      () => {
        const saved = savedRow(change.observation, evaluateTag(change.observation, change.old));
        const dto = toDto(saved);
        expect([toListItem(saved).riskLevel, dto.riskLevel]).toEqual([
          dto.evaluation.riskLevel,
          dto.evaluation.riskLevel,
        ]);
      },
    );
  }
});
