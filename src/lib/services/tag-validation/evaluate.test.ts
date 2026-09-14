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
  thread: "yes",
  zipper: "lampo",
  bales: "yes",
};

const tag = (overrides: Partial<TagObservation> = {}): TagEvaluation => evaluateTag({ ...base, ...overrides });
const fired = (e: TagEvaluation): string[] => [...e.hardSignals, ...e.softSignals].map((s) => s.ruleId);
const hard = (e: TagEvaluation): string[] => e.hardSignals.map((s) => s.ruleId);
const soft = (e: TagEvaluation): string[] => e.softSignals.map((s) => s.ruleId);
const questions = defaultKnowledge.sellerQuestions;

interface Expected {
  risk: "low" | "medium" | "high";
  hard?: string[];
  soft?: string[];
  year: TagEvaluation["year"]["status"];
}

/** Full check of a risk-path result: outcome, level, exact fired lists and year status. */
function expectRisk(e: TagEvaluation, { risk, hard: h = [], soft: s = [], year }: Expected): void {
  expect(e.outcome).toBe("risk");
  expect(e.riskLevel).toBe(risk);
  expect(hard(e).sort()).toEqual([...h].sort());
  expect(soft(e).sort()).toEqual([...s].sort());
  expect(e.year.status).toBe(year);
}

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
    const e = tag({ batchNumber: "2048", seasonLetter: "D", madeInItalySize: "unknown", zipper: "b" });
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
    // The tab back still reads 115748, so the plate/tab mismatch (M-03) fires too.
    expectRisk(e, { risk: "high", hard: ["M-01", "M-03"], year: "resolved" });
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
    expectRisk(e, { risk: "high", hard: ["M-03"], year: "resolved" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["M-03"]);
  });

  it("X5: classic hardware without a metal plate → M-04 hard", () => {
    const e = tag({ tagConstruction: "leather-only" });
    expectRisk(e, { risk: "high", hard: ["M-04"], year: "resolved" });
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
    expectRisk(e, { risk: "high", hard: ["S-02"], year: "unknown" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["S-02"]);
  });

  it("X8: G (F/W 2014) + underscore → S-05 hard", () => {
    const e = tag({ seasonLetter: "G", brandLine: "underscore", stamp925: "unknown", madeInItalySize: "unknown" });
    expectRisk(e, { risk: "high", hard: ["S-05"], year: "resolved" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["S-05"]);
  });

  it("X9: R (S/S 2009) + 925 stamp → S-06 hard", () => {
    const e = tag({ seasonLetter: "R", brandLine: "unknown", stamp925: "present", madeInItalySize: "unknown" });
    expectRisk(e, { risk: "high", hard: ["S-06"], year: "ambiguous" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["S-06"]);
  });

  it("X10: A (S/S 2005) + pewter → S-07 soft, one season past the cutoff", () => {
    const e = tag({ seasonLetter: "A", stamp925: "present", madeInItalySize: "unknown", hardware: "classic-pewter" });
    expectRisk(e, { risk: "medium", soft: ["S-07"], year: "resolved" });
    expect(e.riskLevel).toBe("medium");
    expect(soft(e)).toEqual(["S-07"]);
    expect(hard(e)).toEqual([]);
  });

  it("X11: R (S/S 2009) + flat brass → S-07 hard, seven years past the cutoff", () => {
    const e = tag({ hardware: "classic-flat-brass" });
    expectRisk(e, { risk: "high", hard: ["S-07"], year: "resolved" });
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
    expectRisk(e, { risk: "high", hard: ["S-12"], year: "ambiguous" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toEqual(["S-12"]);
  });

  it("X13: Q (F/W 2009), seller claims 2019 → S-08 soft", () => {
    const e = tag({ seasonLetter: "Q", madeInItalySize: "unknown", declaredYear: 2019 });
    expectRisk(e, { risk: "medium", soft: ["S-08"], year: "resolved" });
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
    expectRisk(e, { risk: "high", hard: ["S-09"], soft: ["S-07"], year: "no-letter" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e)).toContain("S-09");
  });

  it("X15: M (F/W 2011) + small MADE IN ITALY → S-13 soft, transition year", () => {
    const e = tag({ seasonLetter: "M" });
    expectRisk(e, { risk: "medium", soft: ["S-13"], year: "resolved" });
    expect(e.riskLevel).toBe("medium");
    expect(soft(e)).toEqual(["S-13"]);
    expect(e.year).toEqual({ status: "resolved", reading: { season: "F/W", year: 2011 }, resolvedBy: null });
  });

  it("X16: T (S/S 2008) + large MADE IN ITALY → S-13 hard, three years early", () => {
    const e = tag({ seasonLetter: "T", madeInItalySize: "large" });
    expectRisk(e, { risk: "high", hard: ["S-13"], year: "resolved" });
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

  it("tab back typed with spaces inside the number still reads 115748", () => {
    const e = tag({ tabBackFirstNumber: "115 748 3444" });
    expect(e.passed).toContain("M-03");
    expect(e.riskLevel).toBe("low");
  });

  it("tab back without six digits → M-03 abstains with the tab-back question, never fires", () => {
    const e = tag({ tabBackFirstNumber: "11574" });
    expect(e.abstained).toContain("M-03");
    expect(fired(e)).not.toContain("M-03");
    expect(e.sellerQuestions).toContain(questions.tabBack);
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

describe("every rule is accounted for on the risk path", () => {
  const allIds = defaultKnowledge.rules.map((r) => r.id).sort();
  const cases: [string, Partial<TagObservation>][] = [
    ["V1", {}],
    [
      "V5 no letter",
      { seasonLetter: "none", brandLine: "underscore", hardware: "classic-flat-brass", declaredYear: 2002 },
    ],
    ["no letter, claim 2012", { seasonLetter: "none", declaredYear: 2012 }],
    ["illegible letter", { seasonLetter: "unknown" }],
    ["X7 letter X", { seasonLetter: "X" }],
    ["unknown letter Ä", { seasonLetter: "Ä" }],
    ["ambiguous year", { brandLine: "unknown", stamp925: "unknown", madeInItalySize: "unknown" }],
    ["X1 confirmed", { styleNumber: "11574", styleNumberConfirmed: true }],
    ["no reading fits", { seasonLetter: "D", stamp925: "present", madeInItalySize: "unknown" }],
  ];
  for (const [name, overrides] of cases) {
    it(`${name}: each of the 18 rules appears in exactly one list`, () => {
      const e = tag(overrides);
      const listed = [...fired(e), ...e.passed, ...e.abstained].sort();
      expect(listed).toEqual(allIds);
    });
  }
});

describe("year resolution at the boundaries (review F2)", () => {
  it("(a) strict beats tolerance: O + large MADE IN ITALY → F/W 2023", () => {
    const e = tag({
      seasonLetter: "O",
      brandLine: "unknown",
      stamp925: "unknown",
      madeInItalySize: "large",
      zipper: "b",
    });
    expect(e.year).toEqual({ status: "resolved", reading: { season: "F/W", year: 2023 }, resolvedBy: "S-13" });
    expect(e.riskLevel).toBe("low");
  });

  it("(b) both readings excluded by different rules → both fire", () => {
    const e = tag({ seasonLetter: "D", stamp925: "present", madeInItalySize: "unknown" });
    expect(e.riskLevel).toBe("high");
    expect(hard(e).sort()).toEqual(["S-05", "S-06"]);
  });

  it("(b) a rule only within tolerance still fires soft: M + underscore + small MADE IN ITALY", () => {
    const e = tag({ seasonLetter: "M", brandLine: "underscore" });
    expect(hard(e)).toEqual(["S-05"]);
    expect(soft(e)).toEqual(["S-13"]);
    expect(e.passed).not.toContain("S-13");
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

  it("No. typed in the batch field is stripped with its dot", () => {
    expect(tag({ batchNumber: "No. 4892" }).passed).toContain("S-11");
  });

  it("a word starting with No is not a prefix: Nope in the style field → M-01, not M-05", () => {
    const e = tag({ styleNumber: "Nope" });
    expect(e.inputErrors).toEqual([expect.objectContaining({ ruleId: "M-01" })]);
  });

  it("No. 0754 in the style field → M-05", () => {
    expect(tag({ styleNumber: "No. 0754" }).inputErrors).toEqual([expect.objectContaining({ ruleId: "M-05" })]);
  });

  it("N° typed in the batch field is stripped", () => {
    const e = tag({ batchNumber: "N° 4892" });
    expect(e.passed).toContain("S-11");
  });
});

describe("visual checks (rules §7.1)", () => {
  it("V-01: a seam that is not black is a soft signal", () => {
    expectRisk(tag({ thread: "no" }), { risk: "medium", soft: ["V-01"], year: "resolved" });
  });

  it("V-03: bales without the twist are a soft signal", () => {
    expectRisk(tag({ bales: "no" }), { risk: "medium", soft: ["V-03"], year: "resolved" });
  });

  it("can't see on all three abstains, asks the three seller questions and keeps the risk", () => {
    const e = tag({ thread: "unknown", zipper: "unknown", bales: "unknown" });
    expectRisk(e, { risk: "low", year: "resolved" });
    expect(e.abstained).toEqual(expect.arrayContaining(["V-01", "V-02", "V-03"]));
    expect(e.sellerQuestions).toEqual(
      expect.arrayContaining([questions.tagStitching, questions.zipper, questions.bales]),
    );
  });

  it("V-02: a B pull on a bag dated 2005 is hard", () => {
    const e = tag({ seasonLetter: "A", stamp925: "present", madeInItalySize: "unknown", zipper: "b" });
    expectRisk(e, { risk: "high", hard: ["V-02"], year: "resolved" });
    expect(e.hardSignals[0]?.message).toContain("2005");
  });

  it("V-02: a B pull on a bag dated 2014 is soft (one year from the change)", () => {
    expectRisk(tag({ seasonLetter: "H", madeInItalySize: "large", zipper: "b" }), {
      risk: "medium",
      soft: ["V-02"],
      year: "resolved",
    });
  });

  it("V-02: Lampo on a bag dated 2015 is soft", () => {
    expectRisk(tag({ seasonLetter: "F", madeInItalySize: "large" }), {
      risk: "medium",
      soft: ["V-02"],
      year: "resolved",
    });
  });

  it("V-02: Lampo on a bag dated 2016 is hard", () => {
    expectRisk(tag({ seasonLetter: "D", madeInItalySize: "unknown" }), {
      risk: "high",
      hard: ["V-02"],
      year: "resolved",
    });
  });

  it("V-02 abstains while the year is unresolved", () => {
    const e = tag({ brandLine: "unknown", stamp925: "unknown", madeInItalySize: "unknown", zipper: "b" });
    expect(e.year.status).toBe("ambiguous");
    expect(e.abstained).toContain("V-02");
  });

  it("V-02: no season letter (2001–2003) with a B pull is hard", () => {
    const e = tag({
      seasonLetter: "none",
      brandLine: "unknown",
      stamp925: "unknown",
      madeInItalySize: "unknown",
      zipper: "b",
    });
    expect(hard(e)).toContain("V-02");
  });
});
