import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/shared/score-badge";
import { CheckCircle2 } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import type { LeadQuality } from "@prisma/client";

export function OpportunityScoreCard({
  score,
  quality,
  reasons,
  computedAt,
}: {
  score: number | null;
  quality: LeadQuality | null;
  reasons: string[];
  computedAt: Date | null;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Website Opportunity Score</CardTitle>
          {score !== null && quality !== null && <ScoreBadge score={score} quality={quality} size="lg" />}
        </div>
      </CardHeader>
      <CardContent className="pb-5">
        {score === null ? (
          <p className="text-sm text-muted-foreground">Score not yet computed — save this lead or run a website audit to generate one.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-muted-foreground">Why this lead is worth calling:</p>
            <ul className="space-y-2">
              {reasons.map((reason, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
            {computedAt && (
              <p className="mt-4 text-xs text-muted-foreground">Last computed {formatDateTime(computedAt)}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
