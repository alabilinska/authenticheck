import type { HardwareObservation, TagObservation } from "@/types";

/** Radio answer not given yet. */
type Choice<T> = T | null;

/** What the wizard holds while the buyer fills the cards; turned into a TagObservation on submit. */
export interface WizardDraft {
  listingUrl: string;
  declaredYear: string;
  price: string;
  hardware: Choice<HardwareObservation>;
  tagPhoto: Choice<TagObservation["tagPhoto"]>;
  tagConstruction: Choice<TagObservation["tagConstruction"]>;
  styleNumber: string;
  styleNumberConfirmed: boolean;
  batchNumber: string;
  batchUnknown: boolean;
  letterMode: Choice<"letter" | "none" | "unknown">;
  seasonLetter: string;
  tabBackFirstNumber: string;
  tabBackUnknown: boolean;
  madeInItalySize: Choice<TagObservation["madeInItalySize"]>;
  brandLine: Choice<TagObservation["brandLine"]>;
  stamp925: Choice<TagObservation["stamp925"]>;
}

export type DraftField = keyof WizardDraft;
export type FieldErrors = Partial<Record<DraftField, string>>;

export interface StepProps {
  draft: WizardDraft;
  errors: FieldErrors;
  update: <K extends DraftField>(field: K, value: WizardDraft[K]) => void;
}

export const emptyDraft: WizardDraft = {
  listingUrl: "",
  declaredYear: "",
  price: "",
  hardware: null,
  tagPhoto: null,
  tagConstruction: null,
  styleNumber: "",
  styleNumberConfirmed: false,
  batchNumber: "",
  batchUnknown: false,
  letterMode: null,
  seasonLetter: "",
  tabBackFirstNumber: "",
  tabBackUnknown: false,
  madeInItalySize: null,
  brandLine: null,
  stamp925: null,
};

export const STEPS = ["Ogłoszenie", "Okucia", "Płytka", "Odwrót metki", "Oznaczenia"] as const;
export const PLATE_STEP = 2;
const LAST_STEP = STEPS.length - 1;

const REQUIRED = "Wybierz jedną z odpowiedzi.";

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value.trim());
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

function parseYear(value: string): number | null {
  const trimmed = value.trim();
  return /^\d{4}$/.test(trimmed) ? Number(trimmed) : null;
}

export function validateStep(step: number, d: WizardDraft): FieldErrors {
  const e: FieldErrors = {};
  switch (step) {
    case 0:
      if (!d.listingUrl.trim()) e.listingUrl = "Wklej link do ogłoszenia.";
      else if (!isHttpUrl(d.listingUrl)) e.listingUrl = "To nie wygląda na link — powinien zaczynać się od https://.";
      if (d.declaredYear.trim() && parseYear(d.declaredYear) === null) {
        e.declaredYear = "Podaj rok jako cztery cyfry, np. 2009.";
      }
      if (d.price.trim() && !/^\d+([.,]\d{1,2})?$/.test(d.price.trim())) e.price = "Podaj cenę jako liczbę, np. 3200.";
      break;
    case 1:
      if (d.hardware === null) e.hardware = REQUIRED;
      break;
    case PLATE_STEP:
      if (d.tagPhoto === null) e.tagPhoto = REQUIRED;
      if (d.tagPhoto === "present") {
        if (d.tagConstruction === null) e.tagConstruction = REQUIRED;
        if (!d.styleNumber.trim()) e.styleNumber = "Przepisz numer z dolnej linii płytki.";
        if (!d.batchUnknown && !d.batchNumber.trim()) {
          e.batchNumber = "Przepisz numer partii albo zaznacz „Nie widać”.";
        }
        if (d.letterMode === null) e.letterMode = REQUIRED;
        else if (d.letterMode === "letter" && !d.seasonLetter.trim()) e.seasonLetter = "Wpisz literę sezonu.";
      }
      break;
    case 3:
      if (!d.tabBackUnknown && !d.tabBackFirstNumber.trim()) {
        e.tabBackFirstNumber = "Przepisz pierwszy numer albo zaznacz „Nie widać”.";
      }
      if (d.madeInItalySize === null) e.madeInItalySize = REQUIRED;
      break;
    case LAST_STEP:
      if (d.brandLine === null) e.brandLine = REQUIRED;
      if (d.stamp925 === null) e.stamp925 = REQUIRED;
      break;
  }
  return e;
}

/** The engine stops early without the hardware or the tag photo, so the wizard does too. */
export function isFinalStep(step: number, d: WizardDraft): boolean {
  if (step === 1) return d.hardware === "unknown" || d.hardware === "giant-or-other";
  if (step === PLATE_STEP) return d.tagPhoto === "missing";
  return step === LAST_STEP;
}

/** Answers never given (cards skipped by an early stop) are sent as "unknown". */
export function toObservation(d: WizardDraft): TagObservation {
  let seasonLetter = "unknown";
  if (d.letterMode === "none") seasonLetter = "none";
  else if (d.letterMode === "letter") seasonLetter = d.seasonLetter;

  return {
    tagPhoto: d.tagPhoto ?? "present",
    hardware: d.hardware ?? "unknown",
    tagConstruction: d.tagConstruction ?? "unknown",
    styleNumber: d.styleNumber,
    styleNumberConfirmed: d.styleNumberConfirmed,
    batchNumber: d.batchUnknown || !d.batchNumber.trim() ? "unknown" : d.batchNumber,
    seasonLetter,
    tabBackFirstNumber: d.tabBackUnknown || !d.tabBackFirstNumber.trim() ? "unknown" : d.tabBackFirstNumber,
    brandLine: d.brandLine ?? "unknown",
    stamp925: d.stamp925 ?? "unknown",
    madeInItalySize: d.madeInItalySize ?? "unknown",
    declaredYear: parseYear(d.declaredYear),
  };
}
