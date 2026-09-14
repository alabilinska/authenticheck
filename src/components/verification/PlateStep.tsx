import type { InputError, TagObservation } from "@/types";
import { Button } from "@/components/ui/button";
import type { StepProps } from "./draft";
import { ChoiceGroup, StepHeading, TagSketch, TextField, UnknownToggle, type Option } from "./fields";

const photoOptions: Option<TagObservation["tagPhoto"]>[] = [
  { value: "present", label: "Tak" },
  { value: "missing", label: "Nie" },
];

const constructionOptions: Option<TagObservation["tagConstruction"]>[] = [
  { value: "metal-plate", label: "Metalowa płytka na skórzanej metce" },
  { value: "leather-only", label: "Sama skórzana metka, bez płytki" },
  { value: "unknown", label: "Nie widać" },
];

const letterOptions: Option<"letter" | "none" | "unknown">[] = [
  { value: "letter", label: "Jest litera" },
  { value: "none", label: "Brak litery", hint: "Po numerze partii nie ma żadnej litery." },
  { value: "unknown", label: "Nieczytelna / nie widać" },
];

interface PlateStepProps extends StepProps {
  inputError: InputError | null;
  onConfirm: () => void;
}

export function PlateStep({ draft, errors, update, inputError, onConfirm }: PlateStepProps) {
  return (
    <>
      <StepHeading title="Płytka">Metalowa płytka na skórzanej metce w środku torebki.</StepHeading>
      <ChoiceGroup
        name="tagPhoto"
        legend="Czy w ogłoszeniu jest zdjęcie metki z płytką?"
        options={photoOptions}
        value={draft.tagPhoto}
        onChange={(v) => {
          update("tagPhoto", v);
        }}
        error={errors.tagPhoto}
      />
      {draft.tagPhoto === "present" && (
        <>
          <ChoiceGroup
            name="tagConstruction"
            legend="Jak zbudowana jest metka?"
            options={constructionOptions}
            value={draft.tagConstruction}
            onChange={(v) => {
              update("tagConstruction", v);
            }}
            error={errors.tagConstruction}
          />
          <TagSketch
            lines={[
              { text: "BALENCIAGA.PARIS", note: "napis" },
              { text: "N° 1234  R", note: "numer partii + litera" },
              { text: "115748", note: "numer modelu" },
            ]}
          />
          <TextField
            id="styleNumber"
            label="Numer modelu — dolna linia płytki"
            hint="Sześć cyfr pod numerem z N°. Numer z N° to numer partii — wpisz go niżej."
            inputMode="numeric"
            placeholder="np. 115748"
            value={draft.styleNumber}
            onChange={(v) => {
              update("styleNumber", v);
            }}
            error={errors.styleNumber ?? inputError?.message}
          >
            {inputError?.needsConfirmation && (
              <Button
                type="button"
                onClick={onConfirm}
                variant="outline"
                className="mt-2 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white transition-colors hover:bg-white/20"
              >
                Potwierdzam odczyt
              </Button>
            )}
          </TextField>
          <TextField
            id="batchNumber"
            label="Numer partii — górna linia, po N°"
            hint="Znak N° możesz pominąć."
            inputMode="numeric"
            placeholder="np. 1234"
            value={draft.batchNumber}
            disabled={draft.batchUnknown}
            onChange={(v) => {
              update("batchNumber", v);
            }}
            error={errors.batchNumber}
          >
            <UnknownToggle
              id="batchUnknown"
              checked={draft.batchUnknown}
              onChange={(v) => {
                update("batchUnknown", v);
              }}
            />
          </TextField>
          <ChoiceGroup
            name="letterMode"
            legend="Litera sezonu — obok numeru partii"
            options={letterOptions}
            value={draft.letterMode}
            onChange={(v) => {
              update("letterMode", v);
            }}
            error={errors.letterMode}
          />
          {draft.letterMode === "letter" && (
            <TextField
              id="seasonLetter"
              label="Litera sezonu"
              maxLength={1}
              placeholder="np. R"
              value={draft.seasonLetter}
              onChange={(v) => {
                update("seasonLetter", v);
              }}
              error={errors.seasonLetter}
            />
          )}
        </>
      )}
    </>
  );
}
