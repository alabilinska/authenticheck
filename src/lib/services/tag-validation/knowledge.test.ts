import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { knowledgeSchema } from "./schema";
import { defaultKnowledge } from "./evaluate";

describe("knowledge file", () => {
  it("validates against the schema", () => {
    const result = knowledgeSchema.safeParse(defaultKnowledge);
    expect(result.success, result.success ? "" : JSON.stringify(result.error.issues, null, 2)).toBe(true);
  });

  it("contains every rule ID listed in the rules document (§2.4, §3.4, §7.1)", () => {
    const doc = readFileSync(resolve(process.cwd(), "balenciaga-city-tag-rules.md"), "utf8");
    const documented = [...doc.matchAll(/^\| `([MSV]-\d{2})` \|/gm)].map((m) => m[1]);
    const encoded = defaultKnowledge.rules.map((rule) => rule.id);
    expect(documented.length).toBe(21);
    expect(encoded.sort()).toEqual([...documented].sort());
  });

  it("covers every letter except X", () => {
    const letters = Object.keys(defaultKnowledge.seasonLetters).sort();
    const expected = "ABCDEFGHIJKLMNOPQRSTUVWYZ".split("");
    expect(letters).toEqual(expected);
  });
});
