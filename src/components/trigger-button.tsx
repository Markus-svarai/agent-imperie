"use client";

import { useState } from "react";
import { Play, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type State = "idle" | "running" | "done" | "error";

export function TriggerButton({ agentId }: { agentId: string }) {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleTrigger() {
    if (state === "running") return;
    setState("running");
    setMessage(null);

    try {
      const res = await fetch(`/api/agents/${agentId}/trigger`, {
        method: "POST",
      });
      const data = await res.json();

      if (!res.ok || !data.ok) {
        setState("error");
        setMessage(data.error ?? "Ukjent feil");
        setTimeout(() => setState("idle"), 4000);
        return;
      }

      setState("done");
      setMessage(data.summary?.slice(0, 120) ?? "Kjøring fullført");
      setTimeout(() => {
        setState("idle");
        setMessage(null);
      }, 6000);
    } catch (err) {
      setState("error");
      setMessage(String(err));
      setTimeout(() => setState("idle"), 4000);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleTrigger}
        disabled={state === "running"}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
          "border",
          state === "idle" &&
            "bg-accent/10 border-accent/30 text-accent hover:bg-accent/20",
          state === "running" &&
            "bg-bg-elevated border-border text-fg-muted cursor-not-allowed",
          state === "done" &&
            "bg-status-ok/10 border-status-ok/30 text-status-ok",
          state === "error" &&
            "bg-status-error/10 border-status-error/30 text-status-error"
        )}
      >
        {state === "running" ? (
          <Loader2 className="size-4 animate-spin" />
        ) : state === "done" ? (
          <CheckCircle2 className="size-4" />
        ) : state === "error" ? (
          <AlertCircle className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
        {state === "idle" && "Kjør nå"}
        {state === "running" && "Kjører…"}
        {state === "done" && "Fullført"}
        {state === "error" && "Feil"}
      </button>

      {message && (
        <p
          className={cn(
            "text-xs max-w-xs text-right leading-relaxed",
            state === "done" ? "text-fg-muted" : "text-status-error"
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
