import { STEPS } from "./draft";

/** `current` equal to STEPS.length means the result card. */
export function StepProgress({ current }: { current: number }) {
  const onResult = current >= STEPS.length;
  const percent = Math.round(((current + 1) / (STEPS.length + 1)) * 100);
  return (
    <div>
      <p className="text-sm text-blue-100/70">
        {onResult ? (
          <span className="font-medium text-white">Wynik</span>
        ) : (
          <>
            Krok {current + 1} z {STEPS.length}: <span className="font-medium text-white">{STEPS[current]}</span>
          </>
        )}
      </p>
      <div
        role="progressbar"
        aria-label="Postęp weryfikacji"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
      >
        <div className="h-full rounded-full bg-purple-400 transition-all" style={{ width: `${String(percent)}%` }} />
      </div>
    </div>
  );
}
