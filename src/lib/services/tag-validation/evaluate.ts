import knowledgeJson from "@/data/balenciaga-classic-city/knowledge.json";
import type { Knowledge, Period, Reading, RuleDef } from "./schema";
import type {
  HardwareObservation,
  InputError,
  RuleId,
  RuleSignal,
  TagEvaluation,
  TagObservation,
  YearReading,
  YearStatus,
} from "@/types";

/** Validated against the schema in knowledge.test.ts; not parsed at runtime. */
export const defaultKnowledge = knowledgeJson as Knowledge;

type QuestionKey = keyof Knowledge["sellerQuestions"];
type RuleOfKind<K extends RuleDef["kind"]> = Extract<RuleDef, { kind: K }>;
type ClassicHardware = Exclude<HardwareObservation, "unknown" | "giant-or-other">;
type PeriodRule = RuleOfKind<"periodFeature">;

interface Context {
  knowledge: Knowledge;
  hard: RuleSignal[];
  soft: RuleSignal[];
  passed: RuleId[];
  abstained: RuleId[];
  questions: Map<QuestionKey, string>;
}

function rulesOfKind<K extends RuleDef["kind"]>(knowledge: Knowledge, kind: K): RuleOfKind<K>[] {
  return knowledge.rules.filter((rule): rule is RuleOfKind<K> => rule.kind === kind);
}

function ruleOfKind<K extends RuleDef["kind"]>(knowledge: Knowledge, kind: K): RuleOfKind<K> {
  const rule = knowledge.rules.find((r): r is RuleOfKind<K> => r.kind === kind);
  if (rule === undefined) throw new Error(`Knowledge file has no rule of kind "${kind}"`);
  return rule;
}

function fill(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (placeholder, key: string) => vars[key] ?? placeholder);
}

function signal(
  ctx: Context,
  rule: RuleDef,
  severity: "hard" | "soft",
  vars: Record<string, string> = {},
  message = rule.message,
): void {
  const entry: RuleSignal = { ruleId: rule.id, severity, confidence: rule.confidence, message: fill(message, vars) };
  (severity === "hard" ? ctx.hard : ctx.soft).push(entry);
}

function ask(ctx: Context, key: QuestionKey, vars: Record<string, string> = {}): void {
  if (!ctx.questions.has(key)) ctx.questions.set(key, fill(ctx.knowledge.sellerQuestions[key], vars));
}

/** Years between `year` and the closest period; 0 when inside one. */
function distance(year: number, periods: Period[]): number {
  return Math.min(
    ...periods.map(({ from = -Infinity, to = Infinity }) => {
      if (year < from) return from - year;
      if (year > to) return year - to;
      return 0;
    }),
  );
}

/** Gap between two year ranges; 0 when they overlap. */
function rangeGap(aFrom: number, aTo: number, bFrom: number, bTo: number): number {
  if (aTo < bFrom) return bFrom - aTo;
  if (bTo < aFrom) return aFrom - bTo;
  return 0;
}

const toYearReading = ({ season, year }: Reading): YearReading => ({ season, year });

function emptyContext(knowledge: Knowledge): Context {
  return { knowledge, hard: [], soft: [], passed: [], abstained: [], questions: new Map() };
}

function finish(
  ctx: Context,
  outcome: TagEvaluation["outcome"],
  year: YearStatus,
  forcedRisk?: "medium",
): TagEvaluation {
  let riskLevel: TagEvaluation["riskLevel"] = null;
  if (outcome === "risk") {
    if (ctx.hard.length > 0) riskLevel = "high";
    else if (forcedRisk !== undefined || ctx.soft.length > 0) riskLevel = "medium";
    else riskLevel = "low";
  }
  return {
    outcome,
    riskLevel,
    year,
    hardSignals: ctx.hard,
    softSignals: ctx.soft,
    passed: ctx.passed,
    abstained: ctx.abstained,
    inputErrors: [],
    sellerQuestions: [...ctx.questions.values()],
  };
}

function inputError(
  ctx: Context,
  rule: RuleDef,
  field: InputError["field"],
  needsConfirmation: boolean,
): TagEvaluation {
  return {
    ...finish(ctx, "input-error", { status: "unknown" }),
    inputErrors: [{ ruleId: rule.id, field, message: rule.message, needsConfirmation }],
  };
}

function normalizeLetter(raw: string): string | null {
  if (raw === "unknown" || raw === "none") return null;
  return raw.trim().toUpperCase();
}

/** The text after a leading "N°"-style prefix and its separators, or null when there is no prefix. */
function afterPrefix(value: string, prefixes: string[]): string | null {
  const trimmed = value.trim();
  for (const prefix of prefixes) {
    if (!trimmed.toUpperCase().startsWith(prefix.toUpperCase())) continue;
    const rest = trimmed.slice(prefix.length);
    if (/^\p{L}/u.test(rest)) continue; // "Nope" is a word, not a prefix
    return rest.replace(/^[\s.:#]+/, "");
  }
  return null;
}

function stripPrefix(value: string, prefixes: string[]): string {
  return afterPrefix(value, prefixes) ?? value.trim();
}

function featureValue(obs: TagObservation, rule: PeriodRule): string {
  return obs[rule.feature];
}

function featurePeriods(knowledge: Knowledge, rule: PeriodRule, value: string): Period[] {
  const table: Record<string, Period[]> = knowledge.features[rule.feature];
  return table[value] ?? [];
}

function periodMessage(rule: PeriodRule, value: string): string {
  return rule.messageByValue?.[value] ?? rule.message;
}

/**
 * Season-letter rules and the year reading (rules §3, plan "Year resolution rules"):
 * keep the readings compatible with every known period feature; strictly compatible
 * readings win over ones only within a rule's tolerance; when none remains, every rule
 * that excluded a reading fires.
 */
function evaluateLetter(ctx: Context, obs: TagObservation): YearStatus {
  const { knowledge } = ctx;
  const featureRules = rulesOfKind(knowledge, "periodFeature");
  const forbidden = ruleOfKind(knowledge, "letterForbidden");
  const known = ruleOfKind(knowledge, "letterKnown");
  const illegible = ruleOfKind(knowledge, "letterIllegible");
  const branch = ruleOfKind(knowledge, "letterBranch");
  // Every rule ends up fired, passed or abstained; rules with nothing to check abstain.
  const abstain = (...rules: RuleDef[]): void => {
    for (const rule of rules) ctx.abstained.push(rule.id);
  };

  if (obs.seasonLetter.trim() === "unknown") {
    signal(ctx, illegible, "soft");
    ask(ctx, "letterIllegible");
    abstain(known, forbidden, branch, ...featureRules);
    return { status: "unknown" };
  }
  if (obs.seasonLetter.trim() === "none") {
    abstain(known, forbidden, illegible, branch, ...featureRules);
    return { status: "no-letter" };
  }
  ctx.passed.push(illegible.id);

  const letter = obs.seasonLetter.trim().toUpperCase();
  if (forbidden.letters.includes(letter)) {
    signal(ctx, forbidden, "hard");
    abstain(known, branch, ...featureRules);
    return { status: "unknown" };
  }
  ctx.passed.push(forbidden.id);

  const readings: Reading[] | undefined =
    /^[A-Z]$/.test(letter) && Object.hasOwn(knowledge.seasonLetters, letter)
      ? knowledge.seasonLetters[letter]
      : undefined;
  if (readings === undefined) {
    signal(ctx, known, "hard");
    abstain(branch, ...featureRules);
    return { status: "unknown" };
  }
  ctx.passed.push(known.id);

  const observed = featureRules.filter((rule) => {
    if (featureValue(obs, rule) === "unknown") {
      ctx.abstained.push(rule.id);
      return false;
    }
    return true;
  });
  const gap = (rule: PeriodRule, r: Reading): number =>
    distance(r.year, featurePeriods(knowledge, rule, featureValue(obs, rule)));

  const strict = readings.filter((r) => observed.every((rule) => gap(rule, r) === 0));
  const tolerated = readings.filter(
    (r) => !strict.includes(r) && observed.every((rule) => gap(rule, r) <= rule.toleranceYears),
  );
  const pool = strict.length > 0 ? strict : tolerated;

  if (pool.length === 1) {
    const [chosen] = pool;
    for (const rule of observed) {
      if (gap(rule, chosen) === 0) ctx.passed.push(rule.id);
      else signal(ctx, rule, "soft", { rok: String(chosen.year) }, periodMessage(rule, featureValue(obs, rule)));
    }
    let resolvedBy: RuleId | null = null;
    if (readings.length > 1) {
      ctx.passed.push(branch.id);
      const decider = observed.find((rule) => readings.some((r) => r !== chosen && gap(rule, r) > 0));
      resolvedBy = decider?.id ?? null;
    } else abstain(branch);
    return { status: "resolved", reading: toYearReading(chosen), resolvedBy };
  }

  if (pool.length > 1) {
    for (const rule of observed) ctx.passed.push(rule.id);
    ctx.abstained.push(branch.id);
    return { status: "ambiguous", readings: pool.map(toYearReading) };
  }

  // No reading survives: every rule that excluded at least one reading fires hard; a rule that fits no
  // reading exactly but stays within its tolerance fires soft, as it would on its own (X15).
  const years = readings.map((r) => String(r.year)).join(" lub ");
  for (const rule of observed) {
    const message = periodMessage(rule, featureValue(obs, rule));
    if (readings.some((r) => gap(rule, r) > rule.toleranceYears)) signal(ctx, rule, "hard", { rok: years }, message);
    else if (readings.every((r) => gap(rule, r) > 0)) signal(ctx, rule, "soft", { rok: years }, message);
    else ctx.passed.push(rule.id);
  }
  abstain(branch);
  if (readings.length === 1) return { status: "resolved", reading: toYearReading(readings[0]), resolvedBy: null };
  return { status: "ambiguous", readings: readings.map(toYearReading) };
}

function checkHardware(ctx: Context, hardware: ClassicHardware, year: YearStatus): void {
  const rule = ruleOfKind(ctx.knowledge, "hardwareEra");
  if (hardware === "classic-variant-unknown" || year.status === "ambiguous" || year.status === "unknown") {
    ctx.abstained.push(rule.id);
    return;
  }
  const era = ctx.knowledge.hardwareEras[hardware];
  const eraTo = era.to ?? Infinity;
  let gap: number;
  let rok: string;
  if (year.status === "resolved") {
    gap = rangeGap(year.reading.year, year.reading.year, era.from, eraTo);
    rok = String(year.reading.year);
  } else {
    const { from, to } = ctx.knowledge.noLetterPeriod;
    gap = rangeGap(from, to, era.from, eraTo);
    rok = `${String(from)}–${String(to)} (brak litery sezonu)`;
  }
  if (gap === 0) {
    ctx.passed.push(rule.id);
    return;
  }
  const zakres = era.to === null ? `od ${String(era.from)}` : `${String(era.from)}–${String(era.to)}`;
  signal(ctx, rule, gap <= rule.toleranceYears ? "soft" : "hard", { okucia: era.label, zakres, rok });
}

function checkDeclaredYear(ctx: Context, declared: number | null, year: YearStatus): void {
  const { knowledge } = ctx;
  const declaredRule = ruleOfKind(knowledge, "declaredYear");
  const claimRule = ruleOfKind(knowledge, "noLetterClaim");
  const presentedRule = ruleOfKind(knowledge, "noLetterPresented");

  if (year.status === "no-letter") {
    ctx.abstained.push(declaredRule.id);
    if (declared === null) {
      ctx.abstained.push(claimRule.id, presentedRule.id);
      return;
    }
    if (declared > claimRule.afterYear) signal(ctx, claimRule, "hard");
    else ctx.passed.push(claimRule.id);
    if (declared < presentedRule.beforeYear) ctx.passed.push(presentedRule.id);
    else ctx.abstained.push(presentedRule.id);
    return;
  }
  // S-09 and S-10 concern tags without a letter only.
  ctx.abstained.push(claimRule.id, presentedRule.id);
  if (year.status !== "resolved" || declared === null) {
    ctx.abstained.push(declaredRule.id);
    return;
  }
  const rok = String(year.reading.year);
  if (Math.abs(declared - year.reading.year) <= declaredRule.toleranceYears) {
    ctx.passed.push(declaredRule.id);
    return;
  }
  signal(ctx, declaredRule, "soft", { rok, rok_deklarowany: String(declared) });
  ask(ctx, "yearMismatch", { rok });
}

/**
 * Evaluates what the buyer read from a Balenciaga Classic City tag against the knowledge file.
 * Pure and synchronous. Evaluation order is part of the contract (plan: Critical Implementation Details).
 */
export function evaluateTag(obs: TagObservation, knowledge: Knowledge = defaultKnowledge): TagEvaluation {
  const ctx = emptyContext(knowledge);

  if (obs.tagPhoto === "missing") {
    ask(ctx, "tagPhoto");
    return finish(ctx, "risk", { status: "unknown" }, "medium");
  }
  if (obs.hardware === "unknown") {
    ask(ctx, "hardware");
    return finish(ctx, "scope-unknown", { status: "unknown" });
  }
  if (obs.hardware === "giant-or-other") return finish(ctx, "unsupported", { status: "unknown" });
  const hardware = obs.hardware;

  // Row 1 — style number (M-05, M-01, M-02).
  const style = obs.styleNumber.trim();
  const batchLike = ruleOfKind(knowledge, "styleNumberLooksLikeBatch");
  const hasPrefix = afterPrefix(style, batchLike.prefixes) !== null;
  if (hasPrefix || new RegExp(`^\\d{${String(batchLike.batchDigits)}}$`).test(style)) {
    return inputError(ctx, batchLike, "styleNumber", false);
  }
  ctx.passed.push(batchLike.id);

  const format = ruleOfKind(knowledge, "styleNumberFormat");
  const supported = ruleOfKind(knowledge, "styleNumberSupported");
  if (!new RegExp(format.pattern).test(style)) {
    if (!obs.styleNumberConfirmed) return inputError(ctx, format, "styleNumber", true);
    signal(ctx, format, "hard");
    ctx.abstained.push(supported.id);
  } else {
    ctx.passed.push(format.id);
    if (!knowledge.scope.styleNumbers.includes(style)) {
      signal(ctx, supported, "soft");
      return finish(ctx, "unsupported", { status: "unknown" });
    }
    ctx.passed.push(supported.id);
  }

  // M-04 — classic hardware has a metal plate.
  const plate = ruleOfKind(knowledge, "classicHasPlate");
  if (obs.tagConstruction === "unknown") {
    ctx.abstained.push(plate.id);
    ask(ctx, "tagPhoto");
  } else if (obs.tagConstruction === "leather-only") signal(ctx, plate, "hard");
  else ctx.passed.push(plate.id);

  // M-03 — plate number equals the first number on the back of the tab.
  const match = ruleOfKind(knowledge, "plateMatchesTab");
  const tabRaw = obs.tabBackFirstNumber.trim();
  // The first six digits, single spaces allowed between them ("115 748 3444"); fewer than six → abstain.
  const tab = tabRaw === "unknown" ? null : (/\d(?:\s?\d){5}/.exec(tabRaw)?.[0].replace(/\s/g, "") ?? null);
  if (tab === null) {
    ctx.abstained.push(match.id);
    ask(ctx, "tabBack");
  } else if (tab !== style) signal(ctx, match, "hard");
  else ctx.passed.push(match.id);

  // Season letter and the features that date it.
  const year = evaluateLetter(ctx, obs);
  if (obs.brandLine === "unknown" || obs.stamp925 === "unknown") ask(ctx, "tagPhoto");
  if (obs.madeInItalySize === "unknown") ask(ctx, "tabBack");

  // S-11 — batch number format.
  const batchRule = ruleOfKind(knowledge, "batchFormat");
  const batch = obs.batchNumber.trim() === "unknown" ? null : stripPrefix(obs.batchNumber, batchLike.prefixes);
  if (batch === null) {
    ctx.abstained.push(batchRule.id);
    ask(ctx, "tagPhoto");
  } else if (!new RegExp(batchRule.pattern).test(batch)) signal(ctx, batchRule, "soft");
  else ctx.passed.push(batchRule.id);

  // S-12 — known counterfeit combination.
  const fake = ruleOfKind(knowledge, "knownCounterfeit");
  const letter = normalizeLetter(obs.seasonLetter.trim());
  if (batch === null || letter === null) ctx.abstained.push(fake.id);
  else if (fake.combos.some((c) => c.batch === batch && c.letter === letter && c.styleNumber === style)) {
    signal(ctx, fake, "hard");
  } else ctx.passed.push(fake.id);

  checkHardware(ctx, hardware, year);
  checkDeclaredYear(ctx, obs.declaredYear, year);
  return finish(ctx, "risk", year);
}
