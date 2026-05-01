import { cn } from "@/lib/utils";
import { forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-accent hover:bg-accent-glow text-white shadow-glow disabled:opacity-50",
  secondary:
    "bg-bg-elevated hover:bg-border text-fg border border-border disabled:opacity-50",
  ghost: "text-fg-muted hover:text-fg hover:bg-bg-surface",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: Variant;
    size?: Size;
  }
>(function Button(
  { variant = "secondary", size = "md", className, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
});
