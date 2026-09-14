import { useState } from "react";
import { Button } from "@/components/ui/button";
import { apiErrorMessage } from "./report";

type State = "idle" | "confirm" | "deleting" | "error";

/** S-07: delete with an in-page confirmation (no browser dialog), then back to the list. */
export default function DeleteVerification({ verificationId }: { verificationId: string }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function remove() {
    setState("deleting");
    try {
      const response = await fetch(`/api/verifications/${verificationId}`, { method: "DELETE" });
      if (response.status === 204) {
        window.location.assign("/verifications");
        return;
      }
      const body: unknown = await response.json().catch(() => null);
      setMessage(apiErrorMessage(body, "Nie udało się usunąć weryfikacji. Spróbuj ponownie."));
      setState("error");
    } catch {
      setMessage("Nie udało się połączyć z serwerem. Spróbuj ponownie.");
      setState("error");
    }
  }

  if (state === "idle") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          setState("confirm");
        }}
        className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-2 text-sm text-red-100 transition-colors hover:bg-red-500/20"
      >
        Usuń weryfikację
      </Button>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-red-400/40 bg-red-500/10 p-4 text-sm text-red-100">
      <p>Na pewno usunąć tę weryfikację? Tego nie da się cofnąć.</p>
      {state === "error" && (
        <p role="alert" className="text-red-300">
          {message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          disabled={state === "deleting"}
          onClick={() => {
            void remove();
          }}
          className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-500"
        >
          {state === "deleting" ? "Usuwam…" : "Tak, usuń"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={state === "deleting"}
          onClick={() => {
            setState("idle");
          }}
          className="rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm text-white transition-colors hover:bg-white/20"
        >
          Anuluj
        </Button>
      </div>
    </div>
  );
}
