import { describe, expect, it } from "vitest";
import type { RuleSignal, TagEvaluation, TagObservation } from "@/types";
import { evaluateTag } from "./evaluate";
import { v1Observation } from "./fixtures";

// Risk #2: a genuine bag must not get "high risk" from a typo or a misread. Variants come from
// categories of input mistakes, not from the typos already fixed. Where the rules document allows it,
// the engine answers with an input error or an abstention; where the document itself makes the rule hard,
// the "LUKA:" block pins today's behaviour as a known gap.

type Overrides = Partial<TagObservation>;

const tag = (overrides: Overrides): TagEvaluation => evaluateTag({ ...v1Observation, ...overrides });
const ids = (signals: RuleSignal[]): string[] => signals.map((s) => s.ruleId);
const label = (value: string): string => JSON.stringify(value);

const ZWSP = "\u200B"; // zero-width space, arrives with copy-paste

// Rules §8 :327, verbatim.
const TAB_BACK_QUESTION = "Poproszę o zdjęcie odwrotu skórzanej metki, z numerami i napisem MADE IN ITALY.";

describe("safe paths: ambiguous input gives an input error or an abstention", () => {
  const STYLE_TYPOS: [string, string[]][] = [
    ["empty or blank", ["", " "]],
    ["a separator or punctuation inside", ["115 748", "115748."]],
    ["an invisible character", [`115748${ZWSP}`]],
    ["full-width digits", ["１１５７４８"]],
    ["a letter for a digit", ["l15748"]],
    ["a digit missing or doubled", ["11574", "1157488"]],
  ];
  for (const [category, values] of STYLE_TYPOS) {
    it(`unconfirmed style number with ${category} → M-01 input error asking to confirm, no verdict`, () => {
      for (const styleNumber of values) {
        const e = tag({ styleNumber });
        expect(e.outcome, label(styleNumber)).toBe("input-error");
        expect(e.riskLevel, label(styleNumber)).toBeNull();
        expect(e.hardSignals, label(styleNumber)).toEqual([]);
        expect(
          e.inputErrors.map((error) => [error.ruleId, error.needsConfirmation]),
          label(styleNumber),
        ).toEqual([["M-01", true]]);
      }
    });
  }

  const TAB_BACK_UNREADABLE: [string, string[]][] = [
    ["a letter for a digit", ["O15748"]],
    ["a hyphen or a double space inside", ["115-748", "115  748"]],
    ["empty", [""]],
    ["the sentinel in another case", ["Unknown"]],
  ];
  for (const [category, values] of TAB_BACK_UNREADABLE) {
    it(`tab back with fewer than six readable digits (${category}) → M-03 abstains and asks for the tab back`, () => {
      for (const tabBackFirstNumber of values) {
        const e = tag({ tabBackFirstNumber });
        expect(e.abstained, label(tabBackFirstNumber)).toContain("M-03");
        expect([...ids(e.hardSignals), ...ids(e.softSignals)], label(tabBackFirstNumber)).not.toContain("M-03");
        expect(e.sellerQuestions, label(tabBackFirstNumber)).toContain(TAB_BACK_QUESTION);
      }
    });
  }

  it("single spaces inside the tab-back number are allowed: 115 7 48 reads as 115748 and M-03 passes", () => {
    expect(tag({ tabBackFirstNumber: "115 7 48" }).passed).toContain("M-03");
  });

  describe("batch typo next to letter C: S-12 does not fire, the result stays at most medium", () => {
    // Resolvers can't be seen, as in X12, so no other hard rule masks the result.
    const x12: Overrides = { seasonLetter: "C", brandLine: "unknown", stamp925: "unknown", madeInItalySize: "unknown" };

    it("control: the exact combination 0754 C 115748 fires S-12 (X12)", () => {
      expect(ids(tag({ ...x12, batchNumber: "0754" }).hardSignals)).toEqual(["S-12"]);
    });

    for (const batchNumber of ["O754", "0754C", "754"]) {
      it(`${label(batchNumber)} → S-12 passes, S-11 soft, medium`, () => {
        const e = tag({ ...x12, batchNumber });
        expect(e.passed).toContain("S-12");
        expect(e.hardSignals).toEqual([]);
        expect(ids(e.softSignals)).toEqual(["S-11"]);
        expect(e.riskLevel).toBe("medium");
      });
    }
  });
});

// LUKA = a known gap. The rules document itself makes these rules hard, so a typo reaches "high risk".
// The tests pin today's behaviour on purpose: when the document or the engine changes, they turn red and
// force a deliberate update. They are not the target — risk #2 wants an input error or an abstention
// here, and getting there is a product decision that starts in the rules document (CLAUDE.md).
describe("LUKA: the rules document makes these rules hard, so a typo can reach high risk", () => {
  // Document lines live in these comments, not in the test names, so a document edit does not rename tests.
  // §3.4 :182 — S-01 "Letter is a single uppercase letter from the table", signal hard.
  for (const seasonLetter of ["", " ", "Ć", "0", "CC"]) {
    it(`LUKA: S-01 (§3.4 "a single uppercase letter from the table", hard) — malformed letter ${label(seasonLetter)} gives hard S-01; only the wizard blocks it`, () => {
      const e = tag({ seasonLetter });
      expect(e.riskLevel).toBe("high");
      expect(ids(e.hardSignals)).toEqual(["S-01"]);
    });
  }

  // §3.4 :182 — S-01 as above; the engine knows the sentinels "unknown" and "none" in lower case only.
  for (const seasonLetter of ["Unknown", "NONE"]) {
    it(`LUKA: S-01 (§3.4) — sentinel in another case ${label(seasonLetter)} gives hard S-01; the wizard always sends lower case, so only API clients reach it`, () => {
      const e = tag({ seasonLetter });
      expect(e.riskLevel).toBe("high");
      expect(ids(e.hardSignals)).toEqual(["S-01"]);
    });
  }

  const TAB_BACK_TYPOS: [string, string][] = [
    ["adjacent digits swapped", "115784"],
    ["one digit substituted", "115749"],
    ["groups in reverse order", "3444 115748"],
  ];
  // §2.4 :86 — M-03 "Number on the plate = first number on the back of the tab", hard; §5 X4 :262.
  for (const [category, tabBackFirstNumber] of TAB_BACK_TYPOS) {
    it(`LUKA: M-03 (§2.4, X4, hard) — tab back with ${category} (${label(tabBackFirstNumber)}) gives hard M-03 with no confirmation step`, () => {
      const e = tag({ tabBackFirstNumber });
      expect(e.riskLevel).toBe("high");
      expect(ids(e.hardSignals)).toEqual(["M-03"]);
    });
  }

  // §5 X1 :259 — a confirmed 11574 is M-01 hard; §2.1 :45 "Separators: none inside the number".
  for (const styleNumber of ["115 748", `115748${ZWSP}`, "１１５７４８"]) {
    it(`LUKA: M-01 (X1, §2.1 "none inside the number") — confirmed style number ${label(styleNumber)} gives hard M-01 and M-03`, () => {
      const e = tag({ styleNumber, styleNumberConfirmed: true });
      expect(e.riskLevel).toBe("high");
      // M-03 compares the tab back without spaces with the style number as typed, so one format decision fires both.
      expect(ids(e.hardSignals).sort()).toEqual(["M-01", "M-03"]);
    });
  }
});
