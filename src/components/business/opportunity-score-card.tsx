"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/shared/score-badge";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { formatDateTime, cn } from "@/lib/utils";
import type { LeadQuality, LeadConfidence } from "@prisma/client";
import type { ScoreBreakdown } from "@/lib/services/lead-scoring";

const CONFIDENCE_STYLE: Record<LeadConfidence, string> = {
  HIGH: "text-success",
  MEDIUM: "text-warning-foreground",
  LOW: "text-muted-foreground",
};

function CategoryRow({ category }: { category: ScoreBreakdown[keyof ScoreBreakdown] }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between text-sm font-medium">
        <span>{category.label}</span>
        <span className="tabular-nums text-muted-foreground">
          {category.score}/{category.max}
        </span>
      </div>
      {category.items.length === 0 ? (
        <p className="pl-1 text-xs text-muted-foreground">No contributing signals found.</p>
      ) : (
        <ul className="space-y-1 pl-1">
          {category.items.map((item, i) => (
            <li key={i} className="flex items-start justify-between gap-2 text-xs text-muted-foreground">
              <span>{item.label}</span>
              <span className="shrink-0 tabular-nums text-foreground">+{item.points}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function OpportunityScoreCard({
  score,
  quality,
  confidence,
  reasons,
  breakdown,
  computedAt,
}: {
  score: number | null;
  quality: LeadQuality | null;
  confidence: LeadConfidence | null;
  reasons: string[];
  breakdown: ScoreBreakdown | null;
  computedAt: Date | null;
}) {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Website Opportunity Score</CardTitle>
          <div className="flex items-center gap-2">
            {confidence && (
              <Badge variant="outline" className={cn("gap-1", CONFIDENCE_STYLE[confidence])}>
                Confidence: {confidence === "HIGH" ? "High" : confidence === "MEDIUM" ? "Medium" : "Low"}
              </Badge>
            )}
            {score !== null && quality !== null && <ScoreBadge score={score} quality={quality} size="lg" />}
          </div>
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

            {breakdown && (
              <>
                <Button variant="ghost" size="sm" className="mt-3 h-7 px-2 text-xs" onClick={() => setExpanded((v) => !v)}>
                  {expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                  {expanded ? "Hide full breakdown" : "Show full breakdown"}
                </Button>
                {expanded && (
                  <div className="mt-3 space-y-4 rounded-lg border bg-muted/30 p-4">
                    <CategoryRow category={breakdown.businessStrength} />
                    <CategoryRow category={breakdown.websiteNeed} />
                    <CategoryRow category={breakdown.conversionOpportunity} />
                    <CategoryRow category={breakdown.contactability} />
                    <CategoryRow category={breakdown.dataConfidence} />
                  </div>
                )}
              </>
            )}

            {computedAt && <p className="mt-4 text-xs text-muted-foreground">Last computed {formatDateTime(computedAt)}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}
