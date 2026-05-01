import { cn } from "@/lib/utils";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function StatTile({
  label,
  value,
  sublabel,
  delta,
  icon: Icon,
}: {
  label: string;
  value: string;
  sublabel?: string;
  delta?: { value: string; positive?: boolean };
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="surface p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium text-fg-muted uppercase tracking-wider">
          {label}
        </div>
        {Icon && <Icon className="size-4 text-fg-subtle" />}
      </div>
      <div className="mt-3 flex items-baseline gap-2">
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        {delta && (
          <span
            className={cn(
              "inline-flex items-center text-xs font-medium",
              delta.positive ? "text-status-ok" : "text-status-err"
            )}
          >
            {delta.positive ? (
              <ArrowUpRight className="size-3" />
            ) : (
              <ArrowDownRight className="size-3" />
            )}
            {delta.value}
          </span>
        )}
      </div>
      {sublabel && (
        <div className="mt-1 text-xs text-fg-subtle">{sublabel}</div>
      )}
    </div>
  );
}
