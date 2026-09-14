import { describe, expect, it } from "vitest";
import { apiErrorMessage, outcomeLabel, savedVerificationId, sellerMessage, splitAbstained } from "./report";

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

describe("outcomeLabel", () => {
  it("names risk levels and the no-verdict outcomes", () => {
    expect(outcomeLabel("risk", "high")).toBe("Wysokie ryzyko");
    expect(outcomeLabel("risk", "low")).toBe("Niskie ryzyko");
    expect(outcomeLabel("unsupported", null)).toBe("Nieobsługiwany wariant");
  });

  // Risk #1: a result without a risk level must never read as "Niskie ryzyko".
  it("labels no no-verdict outcome as low risk", () => {
    for (const outcome of ["unsupported", "scope-unknown", "input-error"] as const) {
      expect(outcomeLabel(outcome, null)).not.toBe("Niskie ryzyko");
    }
  });

  it("the low-risk label is exactly “Niskie ryzyko”", () => {
    // Keeps the test below honest: it cannot pass because of a typo in the label.
    expect(outcomeLabel("risk", "low")).toBe("Niskie ryzyko");
  });

  // Fixed in lesson 5 (was an it.fails): the label was fail-open — anything not high or medium read as low,
  // including `risk` with no level. The engine never produces that pair (invariants.test.ts), but a future
  // outcome would have inherited the default. Now only "low" reads as low; ResultCard.tsx fails closed too.
  it("risk without a level is not labelled as low risk", () => {
    expect(outcomeLabel("risk", null)).not.toBe("Niskie ryzyko");
    expect(outcomeLabel("risk", null)).toBe("Brak oceny ryzyka");
  });
});

describe("save response guards", () => {
  it("reads the saved id and falls back to null", () => {
    expect(savedVerificationId({ verification: { id: "abc" } })).toBe("abc");
    expect(savedVerificationId({ error: { code: "X" } })).toBeNull();
    expect(savedVerificationId(null)).toBeNull();
  });

  it("reads the API error message and falls back to a generic one", () => {
    expect(apiErrorMessage({ error: { code: "UNAUTHENTICATED", message: "Zaloguj się." } })).toBe("Zaloguj się.");
    expect(apiErrorMessage("oops")).toContain("Nie udało się zapisać");
  });
});
