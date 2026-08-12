import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Gauge, Loader2, AlertCircle, RefreshCw, HelpCircle, Search, Ban } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { isAuditStale, AUDIT_STALE_AFTER_DAYS } from "@/lib/services/website-auditor";
import type { BusinessAudit, BusinessWebsite } from "@/types/business";
import type { AuditIssue } from "@/lib/services/website-auditor";
import type { WebsiteAbsenceStatus } from "@prisma/client";

const SUB_SCORES: { key: keyof BusinessAudit; label: string }[] = [
  { key: "performanceScore", label: "Performance" },
  { key: "mobileScore", label: "Mobile" },
  { key: "seoScore", label: "SEO" },
  { key: "accessibilityScore", label: "Accessibility" },
  { key: "designScore", label: "Design (estimated)" },
  { key: "conversionScore", label: "Conversion (estimated)" },
];

const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 };

function scoreColor(score: number) {
  if (score >= 75) return "bg-success";
  if (score >= 50) return "bg-warning";
  return "bg-destructive";
}

export function WebsiteAuditPanel({
  website,
  loading,
  onRunAudit,
  absenceStatus,
  websiteCheckedAt,
  websiteCheckSource,
  verifying,
  onVerifyWebsite,
}: {
  website: (BusinessWebsite & { audits: BusinessAudit[] }) | null;
  loading: boolean;
  onRunAudit: () => void;
  absenceStatus: WebsiteAbsenceStatus;
  websiteCheckedAt: Date | string | null;
  websiteCheckSource: string | null;
  verifying: boolean;
  onVerifyWebsite: () => void;
}) {
  if (!website) {
    const confirmed = absenceStatus === "CONFIRMED_NONE";
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          {confirmed ? <Ban className="size-8 text-muted-foreground" /> : <HelpCircle className="size-8 text-muted-foreground" />}
          <p className="font-medium">{confirmed ? "No verified website found" : "Website status unknown"}</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {confirmed
              ? "No official website could be confirmed for this business — that's a strong opportunity signal to lead with on the call."
              : "This business hasn't been checked for a website yet, or the source we have is too incomplete to say for sure. Run a check before assuming there isn't one."}
          </p>
          <p className="text-xs text-muted-foreground">
            {websiteCheckedAt ? `Last checked ${formatDateTime(websiteCheckedAt)} — ${websiteCheckSource}` : "Never checked"}
          </p>
          <Button onClick={onVerifyWebsite} disabled={verifying} variant={confirmed ? "outline" : "default"}>
            {verifying ? <Loader2 className="animate-spin" /> : <Search />}
            {verifying ? "Checking…" : confirmed ? "Check again" : "Verify website"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const latestAudit = website.audits[0];

  if (!latestAudit) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Gauge className="size-8 text-muted-foreground" />
          <p className="font-medium">Not yet audited</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Run a technical audit against {website.url} to score performance, mobile-friendliness, SEO and more.
          </p>
          <Button onClick={onRunAudit} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Gauge />}
            {loading ? "Auditing… (can take up to 20s)" : "Run website audit"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const issues = ((latestAudit.issuesJson as unknown as AuditIssue[]) ?? []).slice().sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const stale = isAuditStale(latestAudit.performedAt);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>
            Audited {formatDateTime(latestAudit.performedAt)} via {latestAudit.source === "pagespeed" ? "Google PageSpeed Insights" : "heuristic scan"}
          </span>
          {stale ? (
            <Badge variant="warning">Needs refresh</Badge>
          ) : (
            <Badge variant="success">Fresh</Badge>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onRunAudit} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
          {loading ? "Auditing…" : "Re-audit"}
        </Button>
      </div>
      {stale && (
        <p className="text-xs text-muted-foreground">
          This audit is more than {AUDIT_STALE_AFTER_DAYS} days old — the site may have changed. Consider re-auditing before using it as a talking point.
        </p>
      )}

      {latestAudit.summary && (
        <Card>
          <CardContent className="py-4 text-sm leading-relaxed">{latestAudit.summary}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {SUB_SCORES.map(({ key, label }) => {
          const value = latestAudit[key] as number | null;
          return (
            <Card key={String(key)} className="p-4">
              <p className="text-xs text-muted-foreground">{label}</p>
              {value === null ? (
                <p className="mt-1 text-sm text-muted-foreground">Unknown</p>
              ) : (
                <>
                  <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
                  <Progress value={value} className="mt-2 h-1.5" indicatorClassName={scoreColor(value)} />
                </>
              )}
            </Card>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Issues found ({issues.length})</p>
        {issues.length === 0 ? (
          <p className="text-sm text-muted-foreground">No significant issues detected.</p>
        ) : (
          <ul className="space-y-2">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-2.5 rounded-lg border px-3 py-2.5 text-sm">
                <AlertCircle
                  className={`mt-0.5 size-4 shrink-0 ${
                    issue.severity === "high" ? "text-destructive" : issue.severity === "medium" ? "text-warning-foreground" : "text-muted-foreground"
                  }`}
                />
                <span className="flex-1">{issue.message}</span>
                <Badge variant="outline" className="capitalize">
                  {issue.category}
                </Badge>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
