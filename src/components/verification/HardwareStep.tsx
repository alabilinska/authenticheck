import type { HardwareObservation } from "@/types";
import type { StepProps } from "./draft";
import { ChoiceGroup, StepHeading, type Option } from "./fields";

const options: Option<HardwareObservation>[] = [
  { value: "classic-aged-brass", label: "Klasyczne — postarzany mosiądz (aged brass)", hint: "Od 2004 roku." },
  { value: "classic-pewter", label: "Klasyczne — cynowe (pewter)", hint: "Lata 2003–2004." },
  { value: "classic-flat-brass", label: "Klasyczne — płaski mosiądz (flat brass)", hint: "Lata 2000–2002." },
  { value: "classic-variant-unknown", label: "Klasyczne, ale nie wiem które" },
  { value: "giant-or-other", label: "Giant lub inne" },
  { value: "unknown", label: "Nie widać" },
];

export function HardwareStep({ draft, errors, update }: StepProps) {
  return (
    <>
      <StepHeading title="Okucia">Od okuć zależy, czy umiemy ocenić tę torebkę.</StepHeading>
      <ChoiceGroup
        name="hardware"
        legend="Jakie okucia ma torebka?"
        hint="Spójrz na ćwieki na spodzie torebki i na nit u nasady rączki."
        options={options}
        value={draft.hardware}
        onChange={(v) => {
          update("hardware", v);
        }}
        error={errors.hardware}
      />
    </>
  );
}
