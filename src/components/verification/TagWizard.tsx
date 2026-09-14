import React, { useState } from "react";
import { evaluateTag } from "@/lib/services/tag-validation/evaluate";
import type { InputError, TagEvaluation } from "@/types";
import {
  emptyDraft,
  isFinalStep,
  PLATE_STEP,
  STEPS,
  toObservation,
  validateStep,
  type DraftField,
  type FieldErrors,
  type WizardDraft,
} from "./draft";
import { StepProgress } from "./StepProgress";
import { StartStep } from "./StartStep";
import { HardwareStep } from "./HardwareStep";
import { PlateStep } from "./PlateStep";
import { TabBackStep } from "./TabBackStep";
import { MarkingsStep } from "./MarkingsStep";
import { ResultCard } from "./ResultCard";

export default function TagWizard() {
  const [draft, setDraft] = useState<WizardDraft>(emptyDraft);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [inputError, setInputError] = useState<InputError | null>(null);
  const [result, setResult] = useState<TagEvaluation | null>(null);

  function goTo(next: number) {
    setStep(next);
    window.scrollTo({ top: 0 });
  }

  function update<K extends DraftField>(field: K, value: WizardDraft[K]) {
    setDraft((prev) => ({
      ...prev,
      [field]: value,
      // A corrected style number has to be confirmed again.
      ...(field === "styleNumber" ? { styleNumberConfirmed: false } : {}),
    }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (field === "styleNumber") setInputError(null);
  }

  function evaluate(current: WizardDraft) {
    const evaluation = evaluateTag(toObservation(current));
    if (evaluation.outcome === "input-error") {
      // Input errors concern the style number: back to the plate card with the message.
      setInputError(evaluation.inputErrors.at(0) ?? null);
      setErrors({});
      goTo(PLATE_STEP);
      return;
    }
    setInputError(null);
    setResult(evaluation);
    window.scrollTo({ top: 0 });
  }

  function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const stepErrors = validateStep(step, draft);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) return;
    if (isFinalStep(step, draft)) evaluate(draft);
    else goTo(step + 1);
  }

  function confirmStyleNumber() {
    const confirmed = { ...draft, styleNumberConfirmed: true };
    setDraft(confirmed);
    evaluate(confirmed);
  }

  function restart() {
    setDraft(emptyDraft);
    setErrors({});
    setInputError(null);
    setResult(null);
    goTo(0);
  }

  if (result) {
    return (
      <div className="space-y-4">
        <StepProgress current={STEPS.length} />
        <ResultCard
          evaluation={result}
          listingUrl={draft.listingUrl}
          onEdit={() => {
            setResult(null);
          }}
          onRestart={restart}
        />
      </div>
    );
  }

  const stepProps = { draft, errors, update };
  return (
    <div className="space-y-4">
      <StepProgress current={step} />
      <form
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5 rounded-2xl border border-white/10 bg-white/10 p-5 text-white backdrop-blur-xl sm:p-6"
      >
        {step === 0 && <StartStep {...stepProps} />}
        {step === 1 && <HardwareStep {...stepProps} />}
        {step === PLATE_STEP && <PlateStep {...stepProps} inputError={inputError} onConfirm={confirmStyleNumber} />}
        {step === 3 && <TabBackStep {...stepProps} />}
        {step === 4 && <MarkingsStep {...stepProps} />}
        <div className="flex gap-3 pt-2">
          {step > 0 && (
            <button
              type="button"
              onClick={() => {
                setErrors({});
                goTo(step - 1);
              }}
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm transition-colors hover:bg-white/20"
            >
              Wstecz
            </button>
          )}
          <button
            type="submit"
            className="ml-auto rounded-lg bg-purple-600 px-5 py-2 text-sm font-medium transition-colors hover:bg-purple-500"
          >
            {isFinalStep(step, draft) ? "Sprawdź" : "Dalej"}
          </button>
        </div>
      </form>
    </div>
  );
}
