import type { TagObservation } from "@/types";

/**
 * V1 of the rules document (§5): an in-scope bag with everything visible, `N° 4892 R`, dot brand line,
 * no 925, small MADE IN ITALY, aged brass. Resolves to S/S 2009 by S-13; low risk, no signals.
 * Shared by the test files; override single fields with `{ ...v1Observation, field: value }`.
 */
export const v1Observation: TagObservation = {
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

/**
 * Rules whose Signal column in the rules document says "hard" (§2.4, §3.4, §7.1), including the
 * mixed ones: S-07 "soft at the boundary seasons, hard when off by more than a year", S-12 "hard
 * flag", V-02 "hard; soft within one year of the change". A new hard rule belongs here, in the
 * document first (knowledge.test.ts checks both against each other).
 */
export const documentedHardRules = [
  "M-01",
  "M-03",
  "M-04",
  "S-01",
  "S-02",
  "S-05",
  "S-06",
  "S-07",
  "S-09",
  "S-12",
  "S-13",
  "V-02",
];
