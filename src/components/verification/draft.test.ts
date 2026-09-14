import { describe, expect, it } from "vitest";
import { emptyDraft, fromSaveCommand, toSaveCommand, type WizardDraft } from "./draft";

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
