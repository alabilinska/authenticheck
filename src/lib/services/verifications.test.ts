import { describe, expect, it } from "vitest";
import type { TagObservation } from "@/types";
import { evaluateTag } from "@/lib/services/tag-validation/evaluate";
import { parseRow, saveVerificationSchema, toDto, toInsertRow, toListItem } from "./verifications";

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
