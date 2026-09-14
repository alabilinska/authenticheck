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
