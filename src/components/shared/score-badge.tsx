import { cn } from "@/lib/utils";
import type { LeadQuality } from "@prisma/client";

const QUALITY_STYLES: Record<LeadQuality, string> = {
  HOT: "bg-score-hot/15 text-score-hot border-score-hot/30",
  STRONG: "bg-score-strong/15 text-score-strong border-score-strong/30",
  MEDIUM: "bg-score-medium/20 text-score-medium border-score-medium/40",
  LOW: "bg-score-low/15 text-score-low border-score-low/30",
};

const QUALITY_LABEL: Record<LeadQuality, string> = {
  HOT: "Hot",
  STRONG: "Strong",
  MEDIUM: "Medium",
  LOW: "Low",
};

export function ScoreBadge({ score, quality, size = "md" }: { score: number; quality: LeadQuality; size?: "sm" | "md" | "lg" }) {
  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold tabular-nums",
        QUALITY_STYLES[quality],
        size === "sm" && "px-2 py-0.5 text-xs",
        size === "md" && "px-2.5 py-1 text-sm",
        size === "lg" && "px-3.5 py-1.5 text-base",
      )}
    >
      <span>{score}</span>
      <span className="opacity-70">/100</span>
    </div>
  );
}

export function QualityPill({ quality }: { quality: LeadQuality }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", QUALITY_STYLES[quality])}>
      {QUALITY_LABEL[quality]}
    </span>
  );
}
