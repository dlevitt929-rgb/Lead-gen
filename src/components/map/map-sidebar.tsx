"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { X, Phone, Globe, MapPin, Star, BookmarkPlus, BookmarkCheck, Loader2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScoreBadge } from "@/components/shared/score-badge";
import { WebsiteStatusBadge } from "@/components/shared/website-status-badge";
import type { MapBusiness } from "@/types/map";

export function MapSidebar({ business, onClose, onSaved }: { business: MapBusiness; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = React.useState(false);
  const location = business.locations[0];
  const phone = business.contacts?.find((c) => c.type === "PHONE")?.value;
  const isSaved = business.leads.length > 0;
  const score = business.leadScores[0];

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId: business.id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Saved to your Opportunities.");
      onSaved();
    } catch {
      toast.error("Could not save this lead.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full w-80 shrink-0 flex-col border-l bg-card">
      <div className="flex items-center justify-between border-b p-4">
        <p className="font-medium">Business details</p>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="size-4" />
        </Button>
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <div>
          <p className="font-semibold">{business.name}</p>
          <p className="text-sm capitalize text-muted-foreground">{business.categoryPrimary}</p>
        </div>

        {score && <ScoreBadge score={score.score} quality={score.quality} />}

        <div className="space-y-2 text-sm">
          {business.rating && (
            <div className="flex items-center gap-2">
              <Star className="size-4 fill-warning text-warning" /> {business.rating.toFixed(1)} ({business.reviewCount} reviews)
            </div>
          )}
          {location?.addressFormatted && (
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 size-4 shrink-0 text-muted-foreground" /> {location.addressFormatted}
            </div>
          )}
          {phone && (
            <div className="flex items-center gap-2">
              <Phone className="size-4 text-muted-foreground" /> {phone}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Globe className="size-4 text-muted-foreground" /> <WebsiteStatusBadge website={business.website} absenceStatus={business.websiteAbsenceStatus} />
          </div>
        </div>

        {score && (score.reasonsJson as unknown as string[])?.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Why this lead scores well</p>
            <ul className="list-disc space-y-1 pl-4 text-sm">
              {(score.reasonsJson as unknown as string[]).slice(0, 4).map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button onClick={handleSave} disabled={saving || isSaved} variant={isSaved ? "secondary" : "default"}>
            {saving ? <Loader2 className="animate-spin" /> : isSaved ? <BookmarkCheck /> : <BookmarkPlus />}
            {isSaved ? "Saved" : "Save Lead"}
          </Button>
          {phone && (
            <Button variant="outline" asChild>
              <a href={`tel:${phone}`}>
                <Phone /> Call
              </a>
            </Button>
          )}
          {business.website && (
            <Button variant="outline" asChild>
              <a href={business.website.url} target="_blank" rel="noreferrer">
                <Globe /> Open Website
              </a>
            </Button>
          )}
          {business.googleMapsUrl && (
            <Button variant="outline" asChild>
              <a href={business.googleMapsUrl} target="_blank" rel="noreferrer">
                <MapPin /> Open Maps
              </a>
            </Button>
          )}
          <Button variant="ghost" asChild>
            <Link href={`/business/${business.id}`}>
              <ExternalLink /> Full details
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
