import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Tone = "neutral" | "accent" | "live" | "muted" | "warning";

const TONES: Record<Tone, string> = {
  neutral: "bg-surface-2 text-foreground border-border",
  accent: "bg-accent/15 text-accent border-accent/30",
  live: "bg-live/15 text-live border-live/30",
  muted: "bg-transparent text-muted border-border",
  warning: "bg-amber-500/15 text-amber-400 border-amber-500/30",
};

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

export function Badge({ tone = "neutral", className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        TONES[tone],
        className
      )}
      {...props}
    />
  );
}

/** Pulsing "LIVE" pill. */
export function LiveBadge({ className }: { className?: string }) {
  return (
    <Badge tone="live" className={cn("uppercase tracking-wide", className)}>
      <span className="h-2 w-2 rounded-full bg-live animate-live-dot" />
      Live
    </Badge>
  );
}
