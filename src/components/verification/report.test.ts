import { describe, expect, it } from "vitest";
import { sellerMessage, splitAbstained } from "./report";

describe("sellerMessage", () => {
  it("greets, links the listing and numbers the questions", () => {
    const text = sellerMessage(["Pytanie A?", "Pytanie B?"], "https://example.com/oferta/1");
    expect(text).toBe(
      [
        "Dzień dobry,",
        "mam kilka pytań o torebkę z ogłoszenia https://example.com/oferta/1:",
        "",
        "1. Pytanie A?",
        "2. Pytanie B?",
        "",
        "Dziękuję!",
      ].join("\n"),
    );
  });

  it("is empty when there are no questions", () => {
    expect(sellerMessage([], "https://example.com")).toBe("");
  });
});

describe("splitAbstained", () => {
  it("moves year-dependent rules apart when the year is ambiguous", () => {
    const year = { status: "ambiguous" as const, readings: [] };
    expect(splitAbstained(["S-07", "S-04", "S-08", "V-02", "M-03", "S-07"], year)).toEqual({
      yearUnresolved: ["S-07", "S-08", "V-02"],
      other: ["S-04", "M-03"],
    });
  });

  it("keeps everything together when the year is not ambiguous", () => {
    expect(splitAbstained(["S-07", "M-03"], { status: "unknown" })).toEqual({
      yearUnresolved: [],
      other: ["S-07", "M-03"],
    });
  });
});
