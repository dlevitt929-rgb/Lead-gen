"use client";

import * as React from "react";
import { toast } from "sonner";
import { Sparkles, Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { WebsiteSection } from "@/lib/services/website-concept-types";

// Basic section fields that are safe to edit directly as plain text — kept
// deliberately small (headline/body-style copy only) rather than exposing
// every internal key, since some fields (image ids, hrefs derived from a
// verified phone number, etc.) shouldn't be freely retyped.
const BASIC_TEXT_FIELDS: Record<string, { key: string; label: string; multiline?: boolean }[]> = {
  hero: [
    { key: "headline", label: "Headline" },
    { key: "subheadline", label: "Subheadline", multiline: true },
  ],
  about: [{ key: "body", label: "About text", multiline: true }],
  cta: [
    { key: "heading", label: "Heading" },
    { key: "body", label: "Body", multiline: true },
  ],
  booking: [
    { key: "heading", label: "Heading" },
    { key: "body", label: "Body", multiline: true },
  ],
  quote_form: [
    { key: "heading", label: "Heading" },
    { key: "body", label: "Body", multiline: true },
  ],
  reviews: [{ key: "summary", label: "Summary", multiline: true }],
  hours: [{ key: "heading", label: "Heading" }],
  contact: [{ key: "heading", label: "Heading" }],
  gallery: [{ key: "heading", label: "Heading" }],
  faq: [{ key: "heading", label: "Heading" }],
  services: [{ key: "heading", label: "Heading" }],
};

export function SectionEditor({
  demoId,
  pageId,
  section,
  onSaved,
}: {
  demoId: string;
  pageId: string;
  section: WebsiteSection;
  onSaved: (sectionId: string, data: Record<string, unknown>) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [fields, setFields] = React.useState<Record<string, string>>({});
  const [items, setItems] = React.useState<{ title: string; description: string }[] | null>(null);
  const [instruction, setInstruction] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [applyingAi, setApplyingAi] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    const basicFields = BASIC_TEXT_FIELDS[section.type] ?? [];
    const initial: Record<string, string> = {};
    for (const f of basicFields) {
      const v = section.data[f.key];
      if (typeof v === "string") initial[f.key] = v;
    }
    setFields(initial);
    setItems(section.type === "services" ? ((section.data.items as { title: string; description: string }[]) ?? []) : null);
    setInstruction("");
  }, [open, section]);

  async function handleSaveBasic() {
    setSaving(true);
    try {
      const newData: Record<string, unknown> = { ...fields };
      if (items) newData.items = items;
      onSaved(section.id, { ...section.data, ...newData });
      setOpen(false);
      toast.success("Section updated.");
    } finally {
      setSaving(false);
    }
  }

  async function handleAiEdit() {
    if (!instruction.trim()) return;
    setApplyingAi(true);
    try {
      const res = await fetch(`/api/demos/${demoId}/ai-edit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pageId, sectionId: section.id, instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI edit failed.");
      if (!data.applied) {
        toast.info(data.message || "No AI provider configured — showing your section unchanged.");
        return;
      }
      const updatedSection = (data.demo.contentJson.pages as { id: string; sections: WebsiteSection[] }[])
        .find((p) => p.id === pageId)
        ?.sections.find((s) => s.id === section.id);
      if (updatedSection) {
        onSaved(section.id, updatedSection.data);
        const basicFields = BASIC_TEXT_FIELDS[section.type] ?? [];
        const next: Record<string, string> = {};
        for (const f of basicFields) {
          const v = updatedSection.data[f.key];
          if (typeof v === "string") next[f.key] = v;
        }
        setFields(next);
        if (section.type === "services") setItems((updatedSection.data.items as { title: string; description: string }[]) ?? []);
        toast.success("AI edit applied.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "AI edit failed.");
    } finally {
      setApplyingAi(false);
    }
  }

  const basicFields = BASIC_TEXT_FIELDS[section.type] ?? [];
  if (basicFields.length === 0 && section.type !== "services") return null;

  return (
    <>
      <Button
        size="icon"
        variant="secondary"
        className="absolute right-2 top-2 z-10 size-7 opacity-0 shadow transition-opacity group-hover:opacity-100"
        onClick={() => setOpen(true)}
      >
        <Pencil className="size-3.5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="capitalize">Edit {section.type.replace(/_/g, " ")} section</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {basicFields.map((f) => (
              <div key={f.key} className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">{f.label}</label>
                {f.multiline ? (
                  <Textarea value={fields[f.key] ?? ""} onChange={(e) => setFields((s) => ({ ...s, [f.key]: e.target.value }))} rows={3} />
                ) : (
                  <Input value={fields[f.key] ?? ""} onChange={(e) => setFields((s) => ({ ...s, [f.key]: e.target.value }))} />
                )}
              </div>
            ))}

            {items && (
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Service items</label>
                {items.map((it, i) => (
                  <div key={i} className="space-y-1 rounded-md border p-2">
                    <Input
                      value={it.title}
                      onChange={(e) => setItems((prev) => prev!.map((p, idx) => (idx === i ? { ...p, title: e.target.value } : p)))}
                      placeholder="Title"
                    />
                    <Textarea
                      value={it.description}
                      onChange={(e) => setItems((prev) => prev!.map((p, idx) => (idx === i ? { ...p, description: e.target.value } : p)))}
                      rows={2}
                      placeholder="Description"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1 border-t pt-3">
              <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Sparkles className="size-3.5" /> AI edit command
              </label>
              <div className="flex gap-2">
                <Input
                  value={instruction}
                  onChange={(e) => setInstruction(e.target.value)}
                  placeholder="e.g. make this warmer, shorten the headline…"
                />
                <Button variant="outline" onClick={handleAiEdit} disabled={applyingAi || !instruction.trim()}>
                  {applyingAi ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                  Apply
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBasic} disabled={saving}>
              {saving ? <Loader2 className="size-3.5 animate-spin" /> : null}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
