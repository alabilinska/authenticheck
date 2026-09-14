import { describe, expect, it } from "vitest";
import type { TagEvaluation, TagObservation } from "@/types";
import { defaultKnowledge, evaluateTag } from "./evaluate";

// An in-scope bag with everything visible: V1 of the rules document.
const base: TagObservation = {
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
};

const tag = (overrides: Partial<TagObservation> = {}): TagEvaluation => evaluateTag({ ...base, ...overrides });
const fired = (e: TagEvaluation): string[] => [...e.hardSignals, ...e.softSignals].map((s) => s.ruleId);
const hard = (e: TagEvaluation): string[] => e.hardSignals.map((s) => s.ruleId);
const soft = (e: TagEvaluation): string[] => e.softSignals.map((s) => s.ruleId);
const questions = defaultKnowledge.sellerQuestions;

describe("rules §5 — constructed valid cases", () => {
  it("V1: R + small MADE IN ITALY → S/S 2009, reading chosen by S-13", () => {
    const e = tag();
    expect(e.outcome).toBe("risk");
    expect(e.riskLevel).toBe("low");
    expect(fired(e)).toEqual([]);
    expect(e.year).toEqual({ status: "resolved", reading: { season: "S/S", year: 2009 }, resolvedBy: "S-13" });
  });

  it("V2: M → F/W 2011, letter unambiguous", () => {
    const e = tag({ batchNumber: "3317", seasonLetter: "M", madeInItalySize: "unknown" });
    expect(e.riskLevel).toBe("low");
    expect(fired(e)).toEqual([]);
    expect(e.year).toEqual({ status: "resolved", reading: { season: "F/W", year: 2011 }, resolvedBy: null });
  });

  it("V3: B + underscore → F/W 2004, reading chosen by the brand line", () => {
    const e = tag({
      batchNumber: "1120",
      seasonLetter: "B",
      brandLine: "underscore",
      stamp925: "present",
      hardware: "classic-pewter",
      madeInItalySize: "unknown",
    });
    expect(e.riskLevel).toBe("low");
    expect(fired(e)).toEqual([]);
    expect(e.year).toEqual({ status: "resolved", reading: { season: "F/W", year: 2004 }, resolvedBy: "S-05" });
  });

  it("V4: D + dot → S/S 2016, reading chosen by the brand line", () => {
    const e = tag({ batchNumber: "2048", seasonLetter: "D", madeInItalySize: "unknown" });
    expect(e.riskLevel).toBe("low");
    expect(fired(e)).toEqual([]);
    expect(e.year).toEqual({ status: "resolved", reading: { season: "S/S", year: 2016 }, resolvedBy: "S-05" });
  });

  it("V5: no letter, presented as 2002 → S-10 passes", () => {
    const e = tag({
      batchNumber: "unknown",
      seasonLetter: "none",
      brandLine: "underscore",
      stamp925: "unknown",
      madeInItalySize: "unknown",
      hardware: "classic-flat-brass",
      declaredYear: 2002,
    });
    expect(e.riskLevel).toBe("low");
    expect(fired(e)).toEqual([]);
    expect(e.year).toEqual({ status: "no-letter" });
    expect(e.passed).toEqual(expect.arrayContaining(["S-10", "S-07"]));
  });

  it("V6: A + 925 stamp → S/S 2005, reading chosen by S-06", () => {
    const e = tag({ batchNumber: "5501", seasonLetter: "A", stamp925: "present", madeInItalySize: "unknown" });
    expect(e.riskLevel).toBe("low");
    expect(fired(e)).toEqual([]);
    expect(e.year).toEqual({ status: "resolved", reading: { season: "S/S", year: 2005 }, resolvedBy: "S-06" });
  });
});

describe("rules §5 — invalid cases", () => {
  it("X1: 11574 unconfirmed → input error asking to confirm", () => {
    const e = tag({ styleNumber: "11574" });
    expect(e.outcome).toBe("input-error");
    expect(e.riskLevel).toBeNull();
    expect(e.inputErrors).toEqual([expect.objectContaining({ ruleId: "M-01", needsConfirmation: true })]);
  });

  it("X1 (confirmed): 11574 confirmed → M-01 hard", () => {
    const e = tag({ styleNumber: "11574", styleNumberConfirmed: true });
    expect(e.outcome).toBe("risk");
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toContain("M-01");
  });

  it("X2: 0754 in row 1 → M-05 input error, no risk verdict", () => {
    const e = tag({ styleNumber: "0754" });
    expect(e.outcome).toBe("input-error");
    expect(e.inputErrors).toEqual([expect.objectContaining({ ruleId: "M-05", needsConfirmation: false })]);
  });

  it("X3: other six digits → M-02 unsupported, not risk", () => {
    const e = tag({ styleNumber: "123456" });
    expect(e.outcome).toBe("unsupported");
    expect(e.riskLevel).toBeNull();
    expect(fired(e)).toEqual(["M-02"]);
  });

  it("X4: tab back differs from the plate → M-03 hard", () => {
    const e = tag({ tabBackFirstNumber: "115749" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["M-03"]);
  });

  it("X5: classic hardware without a metal plate → M-04 hard", () => {
    const e = tag({ tagConstruction: "leather-only" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["M-04"]);
  });

  it("X6: hardware not classic → unsupported, never reaches M-04", () => {
    const e = tag({ hardware: "giant-or-other", tagConstruction: "leather-only" });
    expect(e.outcome).toBe("unsupported");
    expect([...fired(e), ...e.passed, ...e.abstained]).not.toContain("M-04");
  });

  it("X7: letter X → S-02 hard", () => {
    const e = tag({ seasonLetter: "X" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["S-02"]);
  });

  it("X8: G (F/W 2014) + underscore → S-05 hard", () => {
    const e = tag({ seasonLetter: "G", brandLine: "underscore", stamp925: "unknown", madeInItalySize: "unknown" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["S-05"]);
  });

  it("X9: R (S/S 2009) + 925 stamp → S-06 hard", () => {
    const e = tag({ seasonLetter: "R", brandLine: "unknown", stamp925: "present", madeInItalySize: "unknown" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["S-06"]);
  });

  it("X10: A (S/S 2005) + pewter → S-07 soft, one season past the cutoff", () => {
    const e = tag({ seasonLetter: "A", stamp925: "present", madeInItalySize: "unknown", hardware: "classic-pewter" });
    expect(e.riskLevel).toBe("medium");
    expect(soft(e)).toEqual(["S-07"]);
    expect(hard(e)).toEqual([]);
  });

  it("X11: R (S/S 2009) + flat brass → S-07 hard, seven years past the cutoff", () => {
    const e = tag({ hardware: "classic-flat-brass" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["S-07"]);
  });

  it("X12: N° 0754 C + 115748 → S-12 hard flag", () => {
    const e = tag({
      batchNumber: "0754",
      seasonLetter: "C",
      brandLine: "unknown",
      stamp925: "unknown",
      madeInItalySize: "unknown",
    });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["S-12"]);
  });

  it("X13: Q (F/W 2009), seller claims 2019 → S-08 soft", () => {
    const e = tag({ seasonLetter: "Q", madeInItalySize: "unknown", declaredYear: 2019 });
    expect(e.riskLevel).toBe("medium");
    expect(soft(e)).toEqual(["S-08"]);
    expect(e.sellerQuestions).toContain(questions.yearMismatch.replace("{rok}", "2009"));
  });

  it("X14: no letter, seller claims 2012 → S-09 hard", () => {
    const e = tag({
      seasonLetter: "none",
      declaredYear: 2012,
      brandLine: "unknown",
      stamp925: "unknown",
      madeInItalySize: "unknown",
    });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toContain("S-09");
  });

  it("X15: M (F/W 2011) + small MADE IN ITALY → S-13 soft, transition year", () => {
    const e = tag({ seasonLetter: "M" });
    expect(e.riskLevel).toBe("medium");
    expect(soft(e)).toEqual(["S-13"]);
    expect(e.year).toEqual({ status: "resolved", reading: { season: "F/W", year: 2011 }, resolvedBy: null });
  });

  it("X16: T (S/S 2008) + large MADE IN ITALY → S-13 hard, three years early", () => {
    const e = tag({ seasonLetter: "T", madeInItalySize: "large" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["S-13"]);
  });
});

describe("rules §3.1 — observed listing strings in the tab-back field", () => {
  for (const observed of ["115748-9770 001013", "115748-1960-535269", "115748 3444"]) {
    it(`"${observed}" reads 115748 and matches the plate`, () => {
      const e = tag({ tabBackFirstNumber: observed });
      expect(e.passed).toContain("M-03");
      expect(e.riskLevel).toBe("low");
    });
  }
});

describe("decided behaviour", () => {
  it("hardware can't be seen → stop with the hardware question", () => {
    const e = tag({ hardware: "unknown" });
    expect(e.outcome).toBe("scope-unknown");
    expect(e.riskLevel).toBeNull();
    expect(e.sellerQuestions).toEqual([questions.hardware]);
  });

  it("no tag photo in the listing → medium risk and the tag-photo question", () => {
    const e = tag({ tagPhoto: "missing" });
    expect(e.outcome).toBe("risk");
    expect(e.riskLevel).toBe("medium");
    expect(e.sellerQuestions).toEqual([questions.tagPhoto]);
  });

  it("tab back can't be seen → M-03 abstains and the tab-back question is asked", () => {
    const e = tag({ tabBackFirstNumber: "unknown" });
    expect(e.abstained).toContain("M-03");
    expect(e.sellerQuestions).toContain(questions.tabBack);
    expect(e.riskLevel).toBe("low");
  });

  it("double letter with every resolver unknown → ambiguous, S-07 and S-08 abstain", () => {
    const e = tag({ brandLine: "unknown", stamp925: "unknown", madeInItalySize: "unknown", declaredYear: 2015 });
    expect(e.year.status).toBe("ambiguous");
    expect(e.abstained).toEqual(expect.arrayContaining(["S-07", "S-08", "S-04"]));
  });

  it("unknown brand line and 925 stamp ask the tag-photo question only once", () => {
    const e = tag({ brandLine: "unknown", stamp925: "unknown", batchNumber: "unknown" });
    expect(e.sellerQuestions.filter((q) => q === questions.tagPhoto)).toHaveLength(1);
  });
});

describe("year resolution at the boundaries (review F2)", () => {
  it("(a) strict beats tolerance: O + large MADE IN ITALY → F/W 2023", () => {
    const e = tag({ seasonLetter: "O", brandLine: "unknown", stamp925: "unknown", madeInItalySize: "large" });
    expect(e.year).toEqual({ status: "resolved", reading: { season: "F/W", year: 2023 }, resolvedBy: "S-13" });
    expect(e.riskLevel).toBe("low");
  });

  it("(b) both readings excluded by different rules → both fire", () => {
    const e = tag({ seasonLetter: "D", stamp925: "present", madeInItalySize: "unknown" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e).sort()).toEqual(["S-05", "S-06"]);
  });

  it("(c) no letter + aged brass → S-07 compared with 2001–2003", () => {
    const e = tag({ seasonLetter: "none", brandLine: "unknown", stamp925: "unknown", madeInItalySize: "unknown" });
    expect(soft(e)).toEqual(["S-07"]);
    expect(e.abstained).toEqual(expect.arrayContaining(["S-09", "S-10"]));
  });
});

describe("input normalization (review F4)", () => {
  it("lowercase season letter is read as uppercase", () => {
    expect(tag({ seasonLetter: " r " }).year).toEqual(tag().year);
  });

  it("N° typed in the style-number field → M-05", () => {
    const e = tag({ styleNumber: "N° 0754" });
    expect(e.inputErrors).toEqual([expect.objectContaining({ ruleId: "M-05" })]);
  });

  it("N° typed in the batch field is stripped", () => {
    const e = tag({ batchNumber: "N° 4892" });
    expect(e.passed).toContain("S-11");
  });
});
