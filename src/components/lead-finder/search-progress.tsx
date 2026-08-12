import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ProgressStep {
  message: string;
  state: "done" | "active";
}

export function SearchProgress({ steps, counter }: { steps: ProgressStep[]; counter?: { done: number; total: number } | null }) {
  if (steps.length === 0) return null;

  return (
    <div className="space-y-1.5 rounded-lg border bg-muted/30 px-4 py-3">
      {steps.map((step, i) => (
        <div key={i} className={cn("flex items-center gap-2 text-sm", step.state === "done" ? "text-muted-foreground" : "font-medium")}>
          {step.state === "done" ? (
            <Check className="size-3.5 shrink-0 text-success" />
          ) : (
            <Loader2 className="size-3.5 shrink-0 animate-spin text-primary" />
          )}
          <span>{step.message}</span>
          {step.state === "active" && counter && counter.total > 0 && (
            <span className="text-xs text-muted-foreground">
              ({counter.done}/{counter.total})
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
