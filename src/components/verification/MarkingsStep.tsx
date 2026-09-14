import type { TagObservation } from "@/types";
import type { StepProps } from "./draft";
import { ChoiceGroup, StepHeading, type Option } from "./fields";

const brandLineOptions: Option<TagObservation["brandLine"]>[] = [
  { value: "underscore", label: "BALENCIAGA_PARIS — z podkreślnikiem" },
  { value: "dot", label: "BALENCIAGA.PARIS — z kropką" },
  { value: "unknown", label: "Nie widać" },
];

const stampOptions: Option<TagObservation["stamp925"]>[] = [
  { value: "present", label: "Jest" },
  { value: "absent", label: "Nie ma" },
  { value: "unknown", label: "Nie widać" },
];

export function MarkingsStep({ draft, errors, update }: StepProps) {
  return (
    <>
      <StepHeading title="Oznaczenia">Napis i stempel na metalowej płytce.</StepHeading>
      <ChoiceGroup
        name="brandLine"
        legend="Napis na płytce"
        options={brandLineOptions}
        value={draft.brandLine}
        onChange={(v) => {
          update("brandLine", v);
        }}
        error={errors.brandLine}
      />
      <ChoiceGroup
        name="stamp925"
        legend="Mały stempel 925 na płytce"
        options={stampOptions}
        value={draft.stamp925}
        onChange={(v) => {
          update("stamp925", v);
        }}
        error={errors.stamp925}
      />
    </>
  );
}
