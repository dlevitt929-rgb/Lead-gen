import { cn } from "@/lib/utils";
import type { DataConfidence } from "@prisma/client";
import { ShieldCheck, Globe, Sparkles, Calculator } from "lucide-react";

const CONFIDENCE_CONFIG: Record<DataConfidence, { label: string; icon: typeof ShieldCheck; className: string }> = {
  VERIFIED: { label: "Verified", icon: ShieldCheck, className: "text-success" },
  PUBLIC: { label: "Public data", icon: Globe, className: "text-primary" },
  AI_INFERRED: { label: "AI inference", icon: Sparkles, className: "text-warning-foreground" },
  ESTIMATED: { label: "Estimated", icon: Calculator, className: "text-muted-foreground" },
};

export function DataProvenance({ confidence, source, className }: { confidence: DataConfidence; source?: string; className?: string }) {
  const config = CONFIDENCE_CONFIG[confidence];
  const Icon = config.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-muted-foreground", className)}>
      <Icon className={cn("size-3", config.className)} />
      {config.label}
      {source && <span className="opacity-70">· {source}</span>}
    </span>
  );
}
