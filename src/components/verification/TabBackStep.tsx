import type { TagObservation } from "@/types";
import type { StepProps } from "./draft";
import { ChoiceGroup, StepHeading, TagSketch, TextField, UnknownToggle, type Option } from "./fields";

const sizeOptions: Option<TagObservation["madeInItalySize"]>[] = [
  { value: "small", label: "Małe litery" },
  { value: "large", label: "Duże litery" },
  { value: "unknown", label: "Nie widać" },
];

export function TabBackStep({ draft, errors, update }: StepProps) {
  return (
    <>
      <StepHeading title="Odwrót metki">Druga strona skórzanej metki, pod płytką.</StepHeading>
      <TagSketch
        lines={[
          { text: "115748  3444", note: "pierwszy numer = numer modelu" },
          { text: "MADE IN ITALY", note: "wielkość napisu" },
        ]}
      />
      <TextField
        id="tabBackFirstNumber"
        label="Pierwszy numer na odwrocie metki"
        hint="Możesz przepisać całą linię — liczy się pierwsza grupa cyfr."
        placeholder="np. 115748 3444"
        value={draft.tabBackFirstNumber}
        disabled={draft.tabBackUnknown}
        onChange={(v) => {
          update("tabBackFirstNumber", v);
        }}
        error={errors.tabBackFirstNumber}
      >
        <UnknownToggle
          id="tabBackUnknown"
          checked={draft.tabBackUnknown}
          onChange={(v) => {
            update("tabBackUnknown", v);
          }}
        />
      </TextField>
      <ChoiceGroup
        name="madeInItalySize"
        legend="Napis MADE IN ITALY"
        options={sizeOptions}
        value={draft.madeInItalySize}
        onChange={(v) => {
          update("madeInItalySize", v);
        }}
        error={errors.madeInItalySize}
      />
    </>
  );
}
