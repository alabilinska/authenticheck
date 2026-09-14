import { z } from "astro/zod";

const confidence = z.enum(["confirmed", "probable"]);

const period = z.object({
  from: z.number().int().optional(),
  to: z.number().int().optional(),
});

const reading = z.object({
  season: z.enum(["S/S", "F/W"]).nullable(),
  year: z.number().int(),
  confidence,
});

const hardwareEra = z.object({
  label: z.string().min(1),
  from: z.number().int(),
  to: z.number().int().nullable(),
});

const ruleBase = {
  id: z.string().regex(/^[MSV]-\d{2}$/),
  /** Short Polish name shown next to passed and abstained rules. */
  title: z.string().min(1),
  confidence,
  message: z.string(),
};

/** What the wizard shows for a visual check (rules §7). */
const visualPrompt = {
  question: z.string().min(1),
  hint: z.string().min(1),
  reference: z.object({ src: z.string().startsWith("/"), alt: z.string().min(1) }),
  sellerQuestion: z.enum(["tagStitching", "zipper", "bales"]),
};

const ruleSchema = z.discriminatedUnion("kind", [
  z.object({
    ...ruleBase,
    kind: z.literal("styleNumberLooksLikeBatch"),
    signal: z.literal("input-error"),
    batchDigits: z.number().int().positive(),
    prefixes: z.array(z.string().min(1)),
  }),
  z.object({ ...ruleBase, kind: z.literal("styleNumberFormat"), signal: z.literal("hard"), pattern: z.string() }),
  z.object({ ...ruleBase, kind: z.literal("styleNumberSupported"), signal: z.literal("unsupported") }),
  z.object({ ...ruleBase, kind: z.literal("plateMatchesTab"), signal: z.literal("hard") }),
  z.object({ ...ruleBase, kind: z.literal("classicHasPlate"), signal: z.literal("hard") }),
  z.object({ ...ruleBase, kind: z.literal("letterKnown"), signal: z.literal("hard") }),
  z.object({
    ...ruleBase,
    kind: z.literal("letterForbidden"),
    signal: z.literal("hard"),
    letters: z.array(z.string().regex(/^[A-Z]$/)),
  }),
  z.object({ ...ruleBase, kind: z.literal("letterIllegible"), signal: z.literal("soft") }),
  z.object({ ...ruleBase, kind: z.literal("letterBranch"), signal: z.literal("branch") }),
  z.object({
    ...ruleBase,
    kind: z.literal("periodFeature"),
    signal: z.literal("hard"),
    feature: z.enum(["brandLine", "stamp925", "madeInItalySize"]),
    /** Within this many years of the feature's period the signal is soft; beyond it, hard. */
    toleranceYears: z.number().int().min(0),
    /** Message for a specific observed value, when the default one only fits the other value. */
    messageByValue: z.record(z.string(), z.string()).optional(),
  }),
  z.object({
    ...ruleBase,
    kind: z.literal("hardwareEra"),
    signal: z.literal("hard"),
    toleranceYears: z.number().int().min(0),
  }),
  z.object({
    ...ruleBase,
    kind: z.literal("declaredYear"),
    signal: z.literal("soft"),
    toleranceYears: z.number().int().min(0),
  }),
  z.object({ ...ruleBase, kind: z.literal("noLetterClaim"), signal: z.literal("hard"), afterYear: z.number().int() }),
  z.object({
    ...ruleBase,
    kind: z.literal("noLetterPresented"),
    signal: z.literal("pass"),
    beforeYear: z.number().int(),
  }),
  z.object({ ...ruleBase, kind: z.literal("batchFormat"), signal: z.literal("soft"), pattern: z.string() }),
  z.object({
    ...ruleBase,
    kind: z.literal("knownCounterfeit"),
    signal: z.literal("hard"),
    combos: z.array(z.object({ batch: z.string(), letter: z.string(), styleNumber: z.string() })),
  }),
  z.object({
    ...ruleBase,
    ...visualPrompt,
    kind: z.literal("visualTrait"),
    signal: z.literal("soft"),
    field: z.enum(["thread", "bales"]),
  }),
  z.object({
    ...ruleBase,
    ...visualPrompt,
    kind: z.literal("zipperEra"),
    signal: z.literal("hard"),
    toleranceYears: z.number().int().min(0),
    periods: z.object({ lampo: hardwareEra, b: hardwareEra }),
  }),
]);

export const knowledgeSchema = z.object({
  source: z.string(),
  scope: z.object({
    styleNumbers: z.array(z.string().regex(/^\d{6}$/)).min(1),
    /** Shown for a bag outside the supported variant (e.g. non-classic hardware). */
    unsupportedMessage: z.string().min(1),
  }),
  hardwareEras: z.object({
    "classic-flat-brass": hardwareEra,
    "classic-pewter": hardwareEra,
    "classic-aged-brass": hardwareEra,
  }),
  noLetterPeriod: z.object({ from: z.number().int(), to: z.number().int() }),
  seasonLetters: z.record(z.string().regex(/^[A-Z]$/), z.array(reading).min(1).max(2)),
  features: z.object({
    brandLine: z.object({ underscore: z.array(period), dot: z.array(period) }),
    stamp925: z.object({ present: z.array(period), absent: z.array(period) }),
    madeInItalySize: z.object({ small: z.array(period), large: z.array(period) }),
  }),
  sellerQuestions: z.object({
    hardware: z.string(),
    tagPhoto: z.string(),
    tabBack: z.string(),
    letterIllegible: z.string(),
    yearMismatch: z.string(),
    tagStitching: z.string(),
    zipper: z.string(),
    bales: z.string(),
  }),
  rules: z.array(ruleSchema),
});

export type Knowledge = z.infer<typeof knowledgeSchema>;
export type RuleDef = z.infer<typeof ruleSchema>;
export type Period = z.infer<typeof period>;
export type Reading = z.infer<typeof reading>;
