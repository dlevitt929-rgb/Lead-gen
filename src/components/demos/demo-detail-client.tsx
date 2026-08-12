"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, Trash2, RefreshCw, Link as LinkIcon, Loader2, Pencil, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoViewer, type CurrentSiteInfo } from "@/components/demos/demo-viewer";
import { WEBSITE_STYLES, WEBSITE_STYLE_LABEL, type WebsiteConcept } from "@/lib/services/website-concept-types";

export function DemoDetailClient({
  demoId,
  title: initialTitle,
  previewToken,
  style: initialStyle,
  concept: initialConcept,
  currentSite,
}: {
  demoId: string;
  title: string;
  previewToken: string;
  style: string;
  concept: WebsiteConcept;
  currentSite: CurrentSiteInfo;
}) {
  const router = useRouter();
  const [title, setTitle] = React.useState(initialTitle);
  const [editingTitle, setEditingTitle] = React.useState(false);
  const [titleDraft, setTitleDraft] = React.useState(initialTitle);
  const [style, setStyle] = React.useState(initialStyle);
  const [concept, setConcept] = React.useState(initialConcept);
  const [regenerating, setRegenerating] = React.useState(false);
  const [duplicating, setDuplicating] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const previewUrl = typeof window !== "undefined" ? `${window.location.origin}/preview/${previewToken}` : `/preview/${previewToken}`;

  async function handleRename() {
    if (!titleDraft.trim() || titleDraft === title) {
      setEditingTitle(false);
      return;
    }
    const res = await fetch(`/api/demos/${demoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: titleDraft.trim() }),
    });
    if (res.ok) {
      setTitle(titleDraft.trim());
      toast.success("Renamed.");
    } else {
      toast.error("Could not rename.");
    }
    setEditingTitle(false);
  }

  async function handleRegenerate(newStyle?: string) {
    setRegenerating(true);
    try {
      const res = await fetch(`/api/demos/${demoId}/regenerate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStyle ? { style: newStyle } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConcept(data.contentJson as WebsiteConcept);
      setStyle(data.style);
      toast.success("Concept regenerated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not regenerate.");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    try {
      const res = await fetch(`/api/demos/${demoId}/duplicate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Duplicated.");
      router.push(`/demo/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not duplicate.");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this website concept? This can't be undone.")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/demos/${demoId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deleted.");
      router.push("/demos");
    } catch {
      toast.error("Could not delete.");
      setDeleting(false);
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(previewUrl);
    toast.success("Preview link copied.");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {editingTitle ? (
            <>
              <Input value={titleDraft} onChange={(e) => setTitleDraft(e.target.value)} className="h-8 w-64" autoFocus />
              <Button size="icon" variant="ghost" className="size-7" onClick={handleRename}>
                <Check className="size-4" />
              </Button>
              <Button size="icon" variant="ghost" className="size-7" onClick={() => setEditingTitle(false)}>
                <X className="size-4" />
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-lg font-semibold">{title}</h2>
              <Button
                size="icon"
                variant="ghost"
                className="size-6"
                onClick={() => {
                  setTitleDraft(title);
                  setEditingTitle(true);
                }}
              >
                <Pencil className="size-3.5" />
              </Button>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={style} onValueChange={(v) => handleRegenerate(v)} disabled={regenerating}>
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
          <Button variant="outline" size="sm" onClick={() => handleRegenerate()} disabled={regenerating}>
            {regenerating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Regenerate
          </Button>
          <Button variant="outline" size="sm" onClick={handleDuplicate} disabled={duplicating}>
            {duplicating ? <Loader2 className="size-3.5 animate-spin" /> : <Copy className="size-3.5" />}
            Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={copyLink}>
            <LinkIcon className="size-3.5" />
            Copy preview link
          </Button>
          <Button variant="outline" size="sm" onClick={handleDelete} disabled={deleting}>
            {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
            Delete
          </Button>
        </div>
      </div>

      <DemoViewer key={concept.generatedAt} demoId={demoId} initialConcept={concept} editable currentSite={currentSite} />
    </div>
  );
}
