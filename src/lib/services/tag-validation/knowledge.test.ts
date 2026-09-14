import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { knowledgeSchema, type Reading, type RuleDef } from "./schema";
import { defaultKnowledge } from "./evaluate";
import { documentedHardRules } from "./fixtures";

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

// Value guard: every value a verdict depends on must come from the rules document, never from
// knowledge.json itself. Tables are parsed from the Markdown; prose values are literals, each with
// the document line it comes from. Changing a rule means changing the document first (CLAUDE.md).

const rulesDoc = readFileSync(resolve(process.cwd(), "balenciaga-city-tag-rules.md"), "utf8");

/** Trimmed cells of a Markdown table row; `null` when the line is not a table row. */
function cells(line: string): string[] | null {
  if (!line.startsWith("|") || !line.endsWith("|")) return null;
  return line
    .slice(1, -1)
    .split("|")
    .map((cell) => cell.trim());
}

/** Lines under a heading, up to the next heading of level 1–3. */
function section(heading: string): string[] {
  const lines = rulesDoc.split("\n");
  const start = lines.findIndex((line) => line.startsWith(heading));
  if (start === -1) throw new Error(`The rules document has no section "${heading}"`);
  const end = lines.findIndex((line, i) => i > start && /^#{1,3} /.test(line));
  return lines.slice(start + 1, end === -1 ? undefined : end);
}

interface DocumentedRule {
  id: string;
  signal: string;
  message: string;
}

/** Rows of the rule tables in §2.4, §3.4 and §7.1: `| ID | Rule | Signal | Status | Message (PL) |`. */
function documentedRules(): DocumentedRule[] {
  const rows: DocumentedRule[] = [];
  for (const line of rulesDoc.split("\n")) {
    const row = cells(line);
    if (row?.length !== 5) continue;
    const [idCell, , signal, , message] = row;
    const id = /^`([MSV]-\d{2})`$/.exec(idCell)?.[1];
    if (id === undefined) continue;
    // S-10 is not a failure and has no message: "—" in the document, "" in the file.
    rows.push({ id, signal, message: message === "—" ? "" : message });
  }
  return rows;
}

type Confidence = Reading["confidence"];

/** Status column of §3.2 → confidence of reading 1 and reading 2. */
const LETTER_STATUS = new Map<string, [Confidence, Confidence]>([
  ["confirmed", ["confirmed", "confirmed"]],
  ["reading 1 confirmed, reading 2 probable", ["confirmed", "probable"]],
]);

/** A §3.2 reading cell: "F/W 2003", "2019" (year only, no season) or "—" (no second reading). */
function parseReading(cell: string, confidence: Confidence): Reading | null {
  if (cell === "—") return null;
  const match = /^(?:(S\/S|F\/W) )?(\d{4})$/.exec(cell);
  if (match === null) throw new Error(`Unreadable reading "${cell}" in §3.2 of the rules document`);
  const season = match[1] === "S/S" || match[1] === "F/W" ? match[1] : null;
  return { season, year: Number(match[2]), confidence };
}

/** The letter table of §3.2 as `seasonLetters`. */
function documentedLetters(): Record<string, Reading[]> {
  const letters: Record<string, Reading[]> = {};
  for (const line of section("### 3.2")) {
    const row = cells(line);
    if (row?.length !== 4 || !/^[A-Z]$/.test(row[0])) continue;
    const [letter, first, second, status] = row;
    const confidences = LETTER_STATUS.get(status);
    if (confidences === undefined) throw new Error(`Unknown status "${status}" for letter ${letter} in §3.2`);
    const readings = [parseReading(first, confidences[0]), parseReading(second, confidences[1])];
    letters[letter] = readings.filter((reading) => reading !== null);
  }
  return letters;
}

type RuleOfKind<K extends RuleDef["kind"]> = Extract<RuleDef, { kind: K }>;

function rule<K extends RuleDef["kind"]>(id: string, kind: K): RuleOfKind<K> {
  const found = defaultKnowledge.rules.find((r): r is RuleOfKind<K> => r.id === id && r.kind === kind);
  if (found === undefined) throw new Error(`knowledge.json has no rule ${id} of kind "${kind}"`);
  return found;
}

describe("knowledge file matches the rules document — tables", () => {
  it("encodes the §3.2 letter table: readings, seasons and confidence", () => {
    const documented = documentedLetters();
    expect(Object.keys(documented)).toHaveLength(25);
    expect(defaultKnowledge.seasonLetters).toEqual(documented);
  });

  it("makes hard exactly the rules whose Signal column says hard", () => {
    const documented = documentedRules()
      .filter((r) => /\bhard\b/.test(r.signal))
      .map((r) => r.id)
      .sort();
    const encoded = defaultKnowledge.rules
      .filter((r) => r.signal === "hard")
      .map((r) => r.id)
      .sort();
    expect(documented).toEqual(documentedHardRules);
    expect(encoded).toEqual(documented);
  });

  it("carries every rule message verbatim from the rule tables", () => {
    const documented = documentedRules();
    expect(documented).toHaveLength(21);
    const encoded = Object.fromEntries(defaultKnowledge.rules.map((r) => [r.id, r.message]));
    expect(encoded).toEqual(Object.fromEntries(documented.map((r) => [r.id, r.message])));
  });

  it("carries the opposite-direction messages of S-06 and S-13 (§3.4 :199-200)", () => {
    // The observed value each bullet names: "stamp absent", "small MADE IN ITALY".
    const valueByRule = new Map([
      ["S-06", "absent"],
      ["S-13", "small"],
    ]);
    const documented = [...rulesDoc.matchAll(/^- `([MSV]-\d{2})`, [^:]+: (.+)$/gm)].map(([, id, message]) => [
      id,
      { [valueByRule.get(id) ?? `unexpected rule ${id}`]: message },
    ]);
    expect(documented).toHaveLength(2);
    const encoded = defaultKnowledge.rules.flatMap((r) =>
      "messageByValue" in r && r.messageByValue !== undefined ? [[r.id, r.messageByValue]] : [],
    );
    expect(Object.fromEntries(encoded)).toEqual(Object.fromEntries(documented));
  });
});

describe("knowledge file matches the rules document — prose values", () => {
  it("dates the hardware eras as §1 and S-07 do", () => {
    // :21-22 "regular aged brass (2004 onward) plus … flat brass (2000–2002) and pewter (2003–2004)"; S-07 :188
    const eras = Object.fromEntries(
      Object.entries(defaultKnowledge.hardwareEras).map(([key, era]) => [key, { from: era.from, to: era.to }]),
    );
    expect(eras).toEqual({
      "classic-flat-brass": { from: 2000, to: 2002 },
      "classic-pewter": { from: 2003, to: 2004 },
      "classic-aged-brass": { from: 2004, to: null },
    });
  });

  it("has no season letter from 2001 to F/W 2003", () => {
    // §3.3 :163 "2001 – F/W 2003 | no season letter at all"
    expect(defaultKnowledge.noLetterPeriod).toEqual({ from: 2001, to: 2003 });
  });

  it("dates the brand line, the 925 stamp and the MADE IN ITALY size as §3.3 does", () => {
    expect(defaultKnowledge.features).toEqual({
      // :164-165 underscore F/W 2003 – 2004, dot 2005 – 2008; :171-172 the contradictions
      brandLine: { underscore: [{ to: 2004 }], dot: [{ from: 2005 }] },
      // :165-166 sterling with 925 in 2005 – 2008, nickel without it from 2008; :173 "925 + after 2008";
      // :199 no stamp in 2005 – 2008 contradicts. 2008 is the transition year, so both values fit it.
      stamp925: { present: [{ to: 2008 }], absent: [{ to: 2004 }, { from: 2008 }] },
      // :167 large lettering from 2011; :174 "large + before 2011"; :200 small "up to 2010"
      madeInItalySize: { small: [{ to: 2010 }], large: [{ from: 2011 }] },
    });
  });

  it("dates the zipper pulls as §7 and V-02 do", () => {
    // :296 "Lampo ≈ 2001–2014"; :310, :313 "Lampo up to 2014 and B from 2015"
    const { lampo, b } = rule("V-02", "zipperEra").periods;
    expect({ lampo: { from: lampo.from, to: lampo.to }, b: { from: b.from, to: b.to } }).toEqual({
      lampo: { from: 2001, to: 2014 },
      b: { from: 2015, to: null },
    });
  });

  it("uses the tolerances the document states, and no others", () => {
    const tolerances = Object.fromEntries(
      defaultKnowledge.rules.flatMap((r) => ("toleranceYears" in r ? [[r.id, r.toleranceYears]] : [])),
    );
    expect(tolerances).toEqual({
      "S-05": 0, // §3.3 :169 "Mutually exclusive, i.e. hard contradictions" — no soft band
      "S-06": 0, // §3.3 :169, same
      "S-07": 1, // :188 "soft at the boundary seasons, hard when off by more than a year"
      "S-08": 1, // §3.2 :155-157 "a one-year tolerance when comparing a letter year against a seller's claim"
      "S-13": 1, // §3.4 :202-204 "one year of tolerance around the change between 2010 and 2011"
      "V-02": 1, // :310 "soft within one year of the change", :313 "one year of tolerance"
    });
  });

  it("keeps the style-number, letter and batch values of §2 and §3.4", () => {
    // §1 :23, §2.2 :52-54 — the whole dictionary
    expect(defaultKnowledge.scope.styleNumbers).toEqual(["115748"]);
    // S-02 :183
    expect(rule("S-02", "letterForbidden").letters).toEqual(["X"]);
    // S-09 :190 "seller claims production after 2003", S-10 :191 "presented as pre-2003"
    expect(rule("S-09", "noLetterClaim").afterYear).toBe(2003);
    expect(rule("S-10", "noLetterPresented").beforeYear).toBe(2003);
    // S-12 :193 "Batch 0754 + letter C + number 115748"
    expect(rule("S-12", "knownCounterfeit").combos).toEqual([{ batch: "0754", letter: "C", styleNumber: "115748" }]);
    // M-05 :88 "Row 1 has 4 digits"
    expect(rule("M-05", "styleNumberLooksLikeBatch").batchDigits).toBe(4);
  });

  it("accepts a style number of exactly six digits and nothing else (§2.1 :43-45, M-01 :84)", () => {
    const pattern = new RegExp(rule("M-01", "styleNumberFormat").pattern);
    expect(pattern.test("115748")).toBe(true);
    expect(["11574", "1157480", "115 748", "11574a", "N°115748", ""].filter((s) => pattern.test(s))).toEqual([]);
  });

  it("accepts a batch number of exactly four digits and nothing else (S-11 :192)", () => {
    const pattern = new RegExp(rule("S-11", "batchFormat").pattern);
    expect(["4892", "0754"].filter((s) => pattern.test(s))).toEqual(["4892", "0754"]);
    expect(["489", "48921", "48 92", "48a2", "N°4892", ""].filter((s) => pattern.test(s))).toEqual([]);
  });
});
