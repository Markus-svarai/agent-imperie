import { cn } from "@/lib/utils";

type Variant = "ok" | "warn" | "err" | "idle" | "accent" | "neutral";

const STYLES: Record<Variant, string> = {
  ok: "bg-status-ok/10 text-status-ok ring-status-ok/20",
  warn: "bg-status-warn/10 text-status-warn ring-status-warn/20",
  err: "bg-status-err/10 text-status-err ring-status-err/20",
  idle: "bg-status-idle/10 text-fg-muted ring-status-idle/30",
  accent: "bg-accent/10 text-accent-glow ring-accent/30",
  neutral: "bg-bg-elevated text-fg-muted ring-border",
};

export function Badge({
  variant = "neutral",
  children,
  className,
}: {
  variant?: Variant;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        STYLES[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

export function StatusDot({
  status,
}: {
  status: "active" | "idle" | "error" | "paused";
}) {
  const color =
    status === "active"
      ? "bg-status-ok"
      : status === "error"
      ? "bg-status-err"
      : status === "paused"
      ? "bg-status-warn"
      : "bg-status-idle";
  return (
    <span className="relative inline-flex">
      <span className={cn("size-2 rounded-full", color)} />
      {status === "active" && (
        <span
          className={cn(
            "absolute inset-0 size-2 rounded-full animate-ping opacity-60",
            color
          )}
        />
      )}
    </span>
  );
}
