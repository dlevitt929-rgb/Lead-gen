"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Sparkles, Loader2, Copy, Trash2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils";
import { WEBSITE_STYLES, WEBSITE_STYLE_LABEL, type WebsiteStyle } from "@/lib/services/website-concept-types";
import type { BusinessDetail } from "@/types/business";

export function WebsiteConceptsPanel({
  demos,
  generating,
  onGenerate,
  onChanged,
}: {
  demos: BusinessDetail["demos"];
  generating: boolean;
  onGenerate: (style?: string) => void;
  onChanged: () => void;
}) {
  const [style, setStyle] = React.useState<string>("modern-minimal");
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function handleDuplicate(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/demos/${id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error();
      toast.success("Duplicated.");
      onChanged();
    } catch {
      toast.error("Could not duplicate.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this website concept?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/demos/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deleted.");
      onChanged();
    } catch {
      toast.error("Could not delete.");
    } finally {
      setBusyId(null);
    }
  }

  function copyLink(token: string) {
    const url = `${window.location.origin}/preview/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Preview link copied.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Fully automatic, multi-page website concepts built from this business&rsquo;s real data.</p>
        <div className="flex gap-2">
          <Select value={style} onValueChange={setStyle}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {WEBSITE_STYLES.map((s) => (
                <SelectItem key={s} value={s}>
                  {WEBSITE_STYLE_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => onGenerate(style)} disabled={generating}>
            {generating ? <Loader2 className="animate-spin" /> : <Sparkles />}
            Generate New Concept
          </Button>
        </div>
      </div>

      {demos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            <Sparkles className="size-6" />
            No website concepts generated yet for this business.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {demos.map((demo) => (
            <Card key={demo.id}>
              <CardContent className="space-y-2 py-4">
                <div className="flex items-start justify-between gap-2">
                  <Link href={`/demo/${demo.id}`} className="font-medium hover:underline">
                    {demo.title}
                  </Link>
                  <Badge variant="outline">{WEBSITE_STYLE_LABEL[demo.style as WebsiteStyle] ?? demo.style}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{formatDateTime(demo.createdAt)}</p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/demo/${demo.id}`}>Open</Link>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => copyLink(demo.previewToken)}>
                    <LinkIcon className="size-3.5" /> Link
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDuplicate(demo.id)} disabled={busyId === demo.id}>
                    <Copy className="size-3.5" /> Duplicate
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(demo.id)} disabled={busyId === demo.id}>
                    <Trash2 className="size-3.5" /> Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
