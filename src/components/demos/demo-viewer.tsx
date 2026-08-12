"use client";

import * as React from "react";
import { toast } from "sonner";
import { Monitor, Tablet, Smartphone, AlertTriangle, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WebsiteRenderer } from "@/components/demos/website-renderer";
import { SectionEditor } from "@/components/demos/section-editor";
import { cn } from "@/lib/utils";
import type { WebsiteConcept } from "@/lib/services/website-concept-types";

export interface CurrentSiteInfo {
  url: string | null;
  audit: {
    performedAt: string;
    performanceScore: number | null;
    mobileScore: number | null;
    seoScore: number | null;
    designScore: number | null;
    conversionScore: number | null;
    issues: { category: string; severity: string; message: string }[];
  } | null;
}

const VIEWPORTS = [
  { id: "desktop" as const, icon: Monitor, label: "Desktop" },
  { id: "tablet" as const, icon: Tablet, label: "Tablet" },
  { id: "mobile" as const, icon: Smartphone, label: "Mobile" },
];

export function DemoViewer({
  demoId,
  initialConcept,
  editable,
  currentSite,
}: {
  demoId: string;
  initialConcept: WebsiteConcept;
  editable: boolean;
  currentSite?: CurrentSiteInfo;
}) {
  const [concept, setConcept] = React.useState(initialConcept);
  const [activePageId, setActivePageId] = React.useState(concept.pages[0]?.id ?? "home");
  const [viewport, setViewport] = React.useState<"desktop" | "tablet" | "mobile">("desktop");
  const [compare, setCompare] = React.useState(false);
  const [saving, setSaving] = React.useState(false);

  const activePage = concept.pages.find((p) => p.id === activePageId) ?? concept.pages[0];

  async function persist(next: WebsiteConcept) {
    setSaving(true);
    try {
      const res = await fetch(`/api/demos/${demoId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentJson: next }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error("Could not save your change.");
    } finally {
      setSaving(false);
    }
  }

  function handleSectionSaved(sectionId: string, data: Record<string, unknown>) {
    setConcept((prev) => {
      const next: WebsiteConcept = {
        ...prev,
        pages: prev.pages.map((p) =>
          p.id !== activePageId ? p : { ...p, sections: p.sections.map((s) => (s.id === sectionId ? { ...s, data } : s)) },
        ),
      };
      void persist(next);
      return next;
    });
  }

  if (!activePage) return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-card px-3 py-2">
        <div className="flex flex-wrap gap-1">
          {concept.pages.map((p) => (
            <Button key={p.id} size="sm" variant={p.id === activePageId ? "default" : "ghost"} onClick={() => setActivePageId(p.id)}>
              {p.title}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          {currentSite && (
            <Button size="sm" variant={compare ? "default" : "outline"} onClick={() => setCompare((c) => !c)}>
              {compare ? "Hide current site" : "Compare with current site"}
            </Button>
          )}
          <div className="flex items-center rounded-md border p-0.5">
            {VIEWPORTS.map((v) => (
              <Button key={v.id} size="icon" variant={viewport === v.id ? "secondary" : "ghost"} className="size-7" onClick={() => setViewport(v.id)} title={v.label}>
                <v.icon className="size-3.5" />
              </Button>
            ))}
          </div>
          {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
        </div>
      </div>

      <div className={cn("grid gap-4", compare && currentSite ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1")}>
        {compare && currentSite && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Current site (before)</p>
            {currentSite.url ? (
              <div className="overflow-hidden rounded-xl border">
                <div className="flex items-center justify-between border-b bg-muted/40 px-3 py-1.5 text-xs">
                  <span className="truncate">{currentSite.url}</span>
                  <a href={currentSite.url} target="_blank" rel="noreferrer" className="flex shrink-0 items-center gap-1 text-primary hover:underline">
                    Open <ExternalLink className="size-3" />
                  </a>
                </div>
                {/* Best-effort — many sites block embedding via X-Frame-Options/CSP, in which case only the audit findings below are shown. */}
                <iframe src={currentSite.url} className="h-[500px] w-full bg-white" title="Current site" />
              </div>
            ) : (
              <div className="rounded-xl border bg-muted/30 p-6 text-center text-sm text-muted-foreground">No existing website found for this business.</div>
            )}
            {currentSite.audit ? (
              <div className="rounded-lg border p-3 text-sm">
                <p className="mb-1 font-medium">Last audit findings</p>
                <ul className="list-disc space-y-0.5 pl-4 text-xs text-muted-foreground">
                  {currentSite.audit.issues.slice(0, 6).map((iss, i) => (
                    <li key={i}>{iss.message}</li>
                  ))}
                  {currentSite.audit.issues.length === 0 && <li>No issues detected.</li>}
                </ul>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">No audit run yet — issues above aren&rsquo;t verified against a measured audit.</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          {compare && <p className="text-sm font-medium text-muted-foreground">New concept (after)</p>}
          <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs">
            <AlertTriangle className="mr-1 inline size-3.5 text-warning-foreground" />
            Concept only — not published anywhere, and not a measured before/after comparison. Facts shown are grounded in real data; anything unconfirmed is
            labeled as a placeholder.
          </div>
          <WebsiteRenderer concept={concept} page={activePage} viewport={viewport} />
          {editable && (
            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-xs font-medium text-muted-foreground">Edit sections on this page</p>
              <div className="flex flex-wrap gap-2">
                {activePage.sections.map((s) => (
                  <div key={s.id} className="group relative">
                    <SectionEditor demoId={demoId} pageId={activePage.id} section={s} onSaved={handleSectionSaved} />
                    <Badge variant="outline" className="cursor-default capitalize">
                      {s.type.replace(/_/g, " ")}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {concept.unknownFacts.length > 0 && (
        <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <span className="font-medium">Not yet confirmed:</span> {concept.unknownFacts.join(", ")} — shown as placeholders above, never fabricated.
        </div>
      )}
    </div>
  );
}
