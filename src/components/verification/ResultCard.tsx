import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { defaultKnowledge } from "@/lib/services/tag-validation/evaluate";
import type { RuleId, RuleSignal, SaveVerificationCommand, TagEvaluation, YearReading, YearStatus } from "@/types";
import { cn } from "@/lib/utils";
import { apiErrorMessage, savedVerificationId, sellerMessage, splitAbstained } from "./report";

const rulesById = new Map(defaultKnowledge.rules.map((rule) => [rule.id, rule]));
const confidenceLabel = { confirmed: "potwierdzona", probable: "prawdopodobna" } as const;

type Tone = "high" | "medium" | "low" | "neutral";

const toneClasses: Record<Tone, string> = {
  high: "border-red-400/40 bg-red-500/15 text-red-100",
  medium: "border-amber-400/40 bg-amber-500/15 text-amber-100",
  low: "border-emerald-400/40 bg-emerald-500/15 text-emerald-100",
  neutral: "border-white/20 bg-white/10 text-white",
};

function headline(e: TagEvaluation): { title: string; tone: Tone; description?: string } {
  switch (e.outcome) {
    case "unsupported":
      return {
        title: "Nieobsługiwany wariant",
        tone: "neutral",
        description: e.softSignals.length === 0 ? defaultKnowledge.scope.unsupportedMessage : undefined,
      };
    case "scope-unknown":
      return {
        title: "Brak danych o okuciach",
        tone: "neutral",
        description:
          "Bez okuć nie wiemy, czy to wariant, który umiemy ocenić. Zapytaj sprzedawcę i wróć do weryfikacji.",
      };
    case "input-error":
      return { title: "Popraw odczyt metki", tone: "neutral" };
    case "risk":
      if (e.riskLevel === "high") return { title: "Wysokie ryzyko", tone: "high" };
      if (e.riskLevel === "medium") return { title: "Średnie ryzyko", tone: "medium" };
      return { title: "Niskie ryzyko — w sprawdzonych cechach nie ma sygnałów ostrzegawczych", tone: "low" };
  }
}

function formatReading({ season, year }: YearReading): string {
  return season === null ? String(year) : `${season} ${String(year)}`;
}

function yearLine(year: YearStatus): string | null {
  switch (year.status) {
    case "resolved":
      return `Rok z metki: ${formatReading(year.reading)}`;
    case "ambiguous":
      return `Rok nierozstrzygnięty: ${year.readings.map(formatReading).join(" lub ")}`;
    case "no-letter": {
      const { from, to } = defaultKnowledge.noLetterPeriod;
      return `Brak litery sezonu — metka z lat ${String(from)}–${String(to)}`;
    }
    case "unknown":
      return null;
  }
}

function Badge({ confidence }: { confidence: RuleSignal["confidence"] }) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[11px]",
        confidence === "confirmed" ? "border-white/25 text-white/80" : "border-dashed border-white/25 text-white/60",
      )}
    >
      {confidenceLabel[confidence]}
    </span>
  );
}

function Section({
  title,
  tone,
  children,
  footer,
}: {
  title: string;
  tone?: Tone;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <section className={cn("rounded-xl border p-4", toneClasses[tone ?? "neutral"])}>
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      <ul className="space-y-3">{children}</ul>
      {footer}
    </section>
  );
}

/** FR-008: copies the seller message; falls back to a text box when the clipboard is unavailable. */
function CopyQuestions({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "manual">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
    } catch {
      setState("manual");
    }
  }

  return (
    <div className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          onClick={() => {
            void copy();
          }}
          variant="outline"
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
        >
          Kopiuj pytania do sprzedawcy
        </Button>
        <span role="status" className="text-xs text-emerald-200">
          {state === "copied" ? "Skopiowano" : ""}
        </span>
      </div>
      {state === "manual" && (
        <textarea
          readOnly
          value={text}
          rows={7}
          aria-label="Wiadomość do sprzedawcy — zaznacz i skopiuj"
          className="w-full rounded-lg border border-white/20 bg-black/30 p-2 text-xs text-white"
        />
      )}
    </div>
  );
}

function SignalItem({ signal }: { signal: RuleSignal }) {
  return (
    <li className="text-sm">
      <div className="flex items-start justify-between gap-3">
        <span className="font-medium">
          {signal.ruleId} · {rulesById.get(signal.ruleId)?.title}
        </span>
        <Badge confidence={signal.confidence} />
      </div>
      <p className="mt-1 opacity-90">{signal.message}</p>
    </li>
  );
}

function RuleItem({ id }: { id: RuleId }) {
  const rule = rulesById.get(id);
  return (
    <li className="flex items-start justify-between gap-3 text-sm">
      <span>
        {id} · {rule?.title}
      </span>
      {rule && <Badge confidence={rule.confidence} />}
    </li>
  );
}

type SaveState = { status: "idle" | "saving" } | { status: "saved"; id: string } | { status: "error"; message: string };

/**
 * S-05 / S-06: saves the verification — POST when new, PUT when it already has an id —
 * and the server evaluates the observation again.
 */
function SaveVerification({
  command,
  verificationId,
  onSaved,
}: {
  command: SaveVerificationCommand;
  verificationId?: string;
  onSaved?: (id: string) => void;
}) {
  const [state, setState] = useState<SaveState>({ status: "idle" });
  const editing = verificationId !== undefined;

  async function save() {
    setState({ status: "saving" });
    try {
      const response = await fetch(editing ? `/api/verifications/${verificationId}` : "/api/verifications", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(command),
      });
      const body: unknown = await response.json();
      const id = response.ok ? savedVerificationId(body) : null;
      if (id === null) {
        setState({ status: "error", message: apiErrorMessage(body) });
        return;
      }
      setState({ status: "saved", id });
      onSaved?.(id);
    } catch {
      setState({ status: "error", message: "Nie udało się połączyć z serwerem. Spróbuj ponownie." });
    }
  }

  if (state.status === "saved") {
    return (
      <p
        role="status"
        className="rounded-xl border border-emerald-400/40 bg-emerald-500/15 p-4 text-sm text-emerald-100"
      >
        {editing ? "Zapisano zmiany." : "Zapisano."}{" "}
        <a href={`/verifications/${state.id}`} className="underline">
          Zobacz zapisaną weryfikację
        </a>{" "}
        albo{" "}
        <a href="/verifications" className="underline">
          przejdź do listy
        </a>
        .
      </p>
    );
  }
  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={state.status === "saving"}
        onClick={() => {
          void save();
        }}
        className="w-full rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-500"
      >
        {state.status === "saving" ? "Zapisuję…" : editing ? "Zapisz zmiany" : "Zapisz weryfikację"}
      </Button>
      {state.status === "error" && (
        <p role="alert" className="text-sm text-red-300">
          {state.message}
        </p>
      )}
    </div>
  );
}

interface ResultCardProps {
  evaluation: TagEvaluation;
  listingUrl: string;
  /** Wizard only: back to the cards. */
  onEdit?: () => void;
  /** Wizard only: start over. */
  onRestart?: () => void;
  /** Wizard only: what to save; absent on a saved verification. */
  saveCommand?: SaveVerificationCommand;
  /** Wizard only: set once the verification exists — saving then updates it (S-06). */
  verificationId?: string;
  onSaved?: (id: string) => void;
}

export function ResultCard({
  evaluation: e,
  listingUrl,
  onEdit,
  onRestart,
  saveCommand,
  verificationId,
  onSaved,
}: ResultCardProps) {
  const head = headline(e);
  const year = e.outcome === "risk" ? yearLine(e.year) : null;
  const passed = [...new Set(e.passed)];
  const { yearUnresolved, other: abstained } = splitAbstained(e.abstained, e.year);

  return (
    <div className="space-y-4 text-white">
      <div className={cn("rounded-2xl border p-5 backdrop-blur-xl", toneClasses[head.tone])}>
        <h2 tabIndex={-1} data-focus-heading className="text-xl font-bold focus:outline-none">
          {head.title}
        </h2>
        {head.description && <p className="mt-2 text-sm opacity-90">{head.description}</p>}
        {year && <p className="mt-2 text-sm font-medium">{year}</p>}
        <p className="mt-3 truncate text-xs opacity-70">
          Ogłoszenie:{" "}
          <a href={listingUrl} target="_blank" rel="noopener noreferrer" className="underline">
            {listingUrl}
          </a>
        </p>
      </div>

      {e.hardSignals.length > 0 && (
        <Section title="Sygnały twarde" tone="high">
          {e.hardSignals.map((s) => (
            <SignalItem key={s.ruleId} signal={s} />
          ))}
        </Section>
      )}
      {e.softSignals.length > 0 && (
        <Section title="Sygnały miękkie" tone="medium">
          {e.softSignals.map((s) => (
            <SignalItem key={s.ruleId} signal={s} />
          ))}
        </Section>
      )}
      {e.sellerQuestions.length > 0 && (
        <Section
          title="Pytania do sprzedawcy"
          footer={<CopyQuestions text={sellerMessage(e.sellerQuestions, listingUrl)} />}
        >
          {e.sellerQuestions.map((q) => (
            <li key={q} className="text-sm">
              {q}
            </li>
          ))}
        </Section>
      )}
      {passed.length > 0 && (
        <Section title="Reguły spełnione" tone="low">
          {passed.map((id) => (
            <RuleItem key={id} id={id} />
          ))}
        </Section>
      )}
      {yearUnresolved.length > 0 && (
        <Section title="Wstrzymane — rok nierozstrzygnięty">
          {yearUnresolved.map((id) => (
            <RuleItem key={id} id={id} />
          ))}
        </Section>
      )}
      {abstained.length > 0 && (
        <Section title="Nie sprawdzono — brak danych albo nie dotyczy">
          {abstained.map((id) => (
            <RuleItem key={id} id={id} />
          ))}
        </Section>
      )}

      {saveCommand && <SaveVerification command={saveCommand} verificationId={verificationId} onSaved={onSaved} />}

      {(onEdit ?? onRestart) && (
        <div className="flex flex-wrap gap-3">
          {onEdit && (
            <Button
              type="button"
              onClick={onEdit}
              variant="outline"
              className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
            >
              Popraw odpowiedzi
            </Button>
          )}
          {onRestart && (
            <Button
              type="button"
              onClick={onRestart}
              className="ml-auto rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium transition-colors hover:bg-purple-500"
            >
              Nowa weryfikacja
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
