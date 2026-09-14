import type { StepProps } from "./draft";
import { StepHeading, TextField } from "./fields";

export function StartStep({ draft, errors, update }: StepProps) {
  return (
    <>
      <StepHeading title="Ogłoszenie">Skąd pochodzi torebka i co mówi o niej sprzedawca.</StepHeading>
      <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
        <span className="text-blue-100/60">Model: </span>Balenciaga Classic City (medium)
      </p>
      <TextField
        id="listingUrl"
        label="Link do ogłoszenia"
        type="url"
        inputMode="url"
        placeholder="https://"
        value={draft.listingUrl}
        onChange={(v) => {
          update("listingUrl", v);
        }}
        error={errors.listingUrl}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          id="declaredYear"
          label="Rok podany przez sprzedawcę"
          hint="Opcjonalnie."
          inputMode="numeric"
          maxLength={4}
          placeholder="np. 2009"
          value={draft.declaredYear}
          onChange={(v) => {
            update("declaredYear", v);
          }}
          error={errors.declaredYear}
        />
        <TextField
          id="price"
          label="Cena"
          hint="Opcjonalnie."
          inputMode="decimal"
          placeholder="np. 3200"
          value={draft.price}
          onChange={(v) => {
            update("price", v);
          }}
          error={errors.price}
        />
      </div>
    </>
  );
}
