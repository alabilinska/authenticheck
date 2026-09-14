import { describe, expect, it } from "vitest";
import { evaluateTag } from "@/lib/services/tag-validation/evaluate";
import {
  emptyDraft,
  fromSaveCommand,
  PLATE_STEP,
  STEPS,
  toObservation,
  toSaveCommand,
  validateStep,
  type WizardDraft,
} from "./draft";

describe("toSaveCommand", () => {
  it("takes the listing data from the start card and the answers as the observation", () => {
    const command = toSaveCommand({
      ...emptyDraft,
      listingUrl: "  https://example.com/oferta/7  ",
      declaredYear: "2009",
      price: "3200,50",
      hardware: "classic-aged-brass",
      thread: "yes",
    });
    expect(command.listingUrl).toBe("https://example.com/oferta/7");
    expect(command.declaredYear).toBe(2009);
    expect(command.price).toBe(3200.5);
    expect(command.observation.hardware).toBe("classic-aged-brass");
    expect(command.observation.declaredYear).toBe(2009);
    expect(command.observation.thread).toBe("yes");
  });

  it("sends empty optional fields as null and unanswered questions as unknown", () => {
    const command = toSaveCommand({ ...emptyDraft, listingUrl: "https://example.com" });
    expect(command.declaredYear).toBeNull();
    expect(command.price).toBeNull();
    expect(command.observation.zipper).toBe("unknown");
    expect(command.observation.bales).toBe("unknown");
  });
});

describe("fromSaveCommand (S-06)", () => {
  const filled: WizardDraft = {
    ...emptyDraft,
    listingUrl: "https://example.com/oferta/7",
    declaredYear: "2009",
    price: "3200,5",
    hardware: "classic-aged-brass",
    tagPhoto: "present",
    tagConstruction: "metal-plate",
    styleNumber: "115748",
    batchNumber: "4892",
    letterMode: "letter",
    seasonLetter: "R",
    tabBackFirstNumber: "115748 3444",
    madeInItalySize: "small",
    brandLine: "dot",
    stamp925: "absent",
    thread: "yes",
    zipper: "lampo",
    bales: "unknown",
  };

  const cases: [string, WizardDraft][] = [
    ["letter, all visible", filled],
    ["no letter, no year, no price", { ...filled, letterMode: "none", seasonLetter: "", declaredYear: "", price: "" }],
    [
      "illegible letter, unknown batch and tab back",
      { ...filled, letterMode: "unknown", seasonLetter: "", batchUnknown: true, tabBackUnknown: true },
    ],
  ];
  for (const [name, draft] of cases) {
    it(`round-trips a saved command: ${name}`, () => {
      const command = toSaveCommand(draft);
      expect(toSaveCommand(fromSaveCommand(command))).toEqual(command);
    });
  }

  it("restores the letter mode and the can't-see toggles", () => {
    const draft = fromSaveCommand(toSaveCommand({ ...filled, letterMode: "unknown", batchUnknown: true }));
    expect(draft.letterMode).toBe("unknown");
    expect(draft.batchUnknown).toBe(true);
    expect(draft.batchNumber).toBe("");
  });
});

// Risk #2: the wizard is today the only guard between a mistyped season letter and a hard S-01 in the
// engine (the API accepts any letter up to 10 characters), so the guard itself is under test.

/** Every card answered as V1 of the rules document. */
const v1Draft: WizardDraft = {
  ...emptyDraft,
  listingUrl: "https://example.com/oferta/1",
  hardware: "classic-aged-brass",
  tagPhoto: "present",
  tagConstruction: "metal-plate",
  styleNumber: "115748",
  batchNumber: "4892",
  letterMode: "letter",
  seasonLetter: "R",
  tabBackFirstNumber: "115748",
  madeInItalySize: "small",
  brandLine: "dot",
  stamp925: "absent",
  thread: "yes",
  zipper: "lampo",
  bales: "yes",
};

const TAB_BACK_STEP = STEPS.indexOf("Odwrót metki");
const ZWSP = "\u200B"; // zero-width space, arrives with copy-paste

/** Letters the engine would turn into a hard S-01, grouped by the kind of mistake — not by past bugs. */
const BAD_LETTERS: [string, string[]][] = [
  ["empty or blank", ["", " "]],
  ["outside A–Z", ["0", "Ć", "ą", "Ä"]],
  ["two characters or punctuation", ["CC", "C.", "C1"]],
  ["full-width", ["Ｃ"]],
  ["with an invisible character", [`C${ZWSP}`]],
  ["a sentinel typed as a letter", ["Unknown", "none"]],
];
/** X is let through on purpose: S-02 is a real hard rule of the document, not a typo. */
const GOOD_LETTERS = ["c", " R ", "X"];

describe("validateStep", () => {
  it("accepts every card of the V1 draft", () => {
    STEPS.forEach((_title, step) => {
      expect(validateStep(step, v1Draft), STEPS[step]).toEqual({});
    });
  });

  for (const [category, letters] of BAD_LETTERS) {
    it(`rejects a season letter that is ${category}: ${letters.map((l) => JSON.stringify(l)).join(", ")}`, () => {
      for (const seasonLetter of letters) {
        expect(validateStep(PLATE_STEP, { ...v1Draft, seasonLetter }), JSON.stringify(seasonLetter)).toHaveProperty(
          "seasonLetter",
        );
      }
    });
  }

  it(`accepts a single letter A–Z in any case, with spaces around: ${GOOD_LETTERS.map((l) => JSON.stringify(l)).join(", ")}`, () => {
    for (const seasonLetter of GOOD_LETTERS) {
      expect(validateStep(PLATE_STEP, { ...v1Draft, seasonLetter }), JSON.stringify(seasonLetter)).toEqual({});
    }
  });

  it("requires the letter mode", () => {
    expect(validateStep(PLATE_STEP, { ...v1Draft, letterMode: null })).toHaveProperty("letterMode");
  });

  it("requires the style number", () => {
    expect(validateStep(PLATE_STEP, { ...v1Draft, styleNumber: "" })).toHaveProperty("styleNumber");
    expect(validateStep(PLATE_STEP, { ...v1Draft, styleNumber: " " })).toHaveProperty("styleNumber");
  });

  it("requires the batch number unless it is marked can't see", () => {
    expect(validateStep(PLATE_STEP, { ...v1Draft, batchNumber: "" })).toHaveProperty("batchNumber");
    expect(validateStep(PLATE_STEP, { ...v1Draft, batchNumber: "", batchUnknown: true })).toEqual({});
  });

  it("requires the tab-back number unless it is marked can't see", () => {
    expect(validateStep(TAB_BACK_STEP, { ...v1Draft, tabBackFirstNumber: "" })).toHaveProperty("tabBackFirstNumber");
    expect(validateStep(TAB_BACK_STEP, { ...v1Draft, tabBackFirstNumber: "", tabBackUnknown: true })).toEqual({});
  });
});

describe("wizard → engine (risk #2)", () => {
  it("a season letter the plate card accepts never produces S-01", () => {
    const letters = [...BAD_LETTERS.flatMap(([, values]) => values), ...GOOD_LETTERS];
    const accepted = letters.filter((seasonLetter) => {
      return Object.keys(validateStep(PLATE_STEP, { ...v1Draft, seasonLetter })).length === 0;
    });
    for (const seasonLetter of accepted) {
      const e = evaluateTag(toObservation({ ...v1Draft, seasonLetter }));
      expect(
        e.hardSignals.map((s) => s.ruleId),
        JSON.stringify(seasonLetter),
      ).not.toContain("S-01");
    }
    // Not vacuous: the valid letters did go through the chain.
    expect(accepted).toEqual(expect.arrayContaining(GOOD_LETTERS));
  });
});
