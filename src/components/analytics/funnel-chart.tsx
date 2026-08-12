import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function FunnelChart({ stages }: { stages: { stage: string; value: number }[] }) {
  const max = Math.max(1, ...stages.map((s) => s.value));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Funnel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 pb-5">
        {stages.map((s, i) => {
          const pct = Math.round((s.value / max) * 100);
          const prev = stages[i - 1]?.value;
          const dropOff = prev ? Math.round(((prev - s.value) / (prev || 1)) * 100) : null;
          return (
            <div key={s.stage} className="space-y-1">
              <div className="flex items-baseline justify-between text-sm">
                <span className="font-medium">{s.stage}</span>
                <span className="tabular-nums text-muted-foreground">
                  {s.value}
                  {dropOff !== null && dropOff > 0 && <span className="ml-2 text-xs">(-{dropOff}%)</span>}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.max(pct, s.value > 0 ? 4 : 0)}%` }} />
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
