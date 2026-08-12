"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Star,
  Phone,
  Globe,
  MapPin,
  BookmarkPlus,
  Loader2,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PageHeader } from "@/components/shared/page-header";
import { OpportunityScoreCard } from "@/components/business/opportunity-score-card";
import { ContactInfoCard } from "@/components/business/contact-info-card";
import { WebsiteAuditPanel } from "@/components/business/website-audit-panel";
import { SalesAnglePanel } from "@/components/business/sales-angle-panel";
import { TimelinePanel } from "@/components/business/timeline-panel";
import { WebsiteConceptsPanel } from "@/components/business/website-concepts-panel";
import { PrepareForCallButton } from "@/components/business/prepare-for-call-button";
import { formatCurrencyRange, formatDate } from "@/lib/utils";
import { LEAD_STATUSES, LEAD_STATUS_LABEL } from "@/lib/lead-status";
import type { BusinessDetail } from "@/types/business";
import type { SalesAngle } from "@/lib/services/ai-sales-assistant";
import type { ScoreBreakdown } from "@/lib/services/lead-scoring";
import type { LeadStatus } from "@prisma/client";

const BUSINESS_DATA_STALE_AFTER_DAYS = 14;

function isDataStale(checkedAt: Date | string) {
  const date = typeof checkedAt === "string" ? new Date(checkedAt) : checkedAt;
  const ageDays = (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24);
  return ageDays > BUSINESS_DATA_STALE_AFTER_DAYS;
}

export function BusinessDetailClient({ business: initial, repName }: { business: BusinessDetail; repName?: string | null }) {
  const router = useRouter();
  const [business, setBusiness] = React.useState(initial);
  const [saving, setSaving] = React.useState(false);
  const [auditing, setAuditing] = React.useState(false);
  const [generatingAngle, setGeneratingAngle] = React.useState(false);
  const [generatingDemo, setGeneratingDemo] = React.useState(false);
  const [angle, setAngle] = React.useState<{ data: SalesAngle; source: "ai" | "fallback" } | null>(null);
  const [updatingStatus, setUpdatingStatus] = React.useState(false);
  const [verifyingWebsite, setVerifyingWebsite] = React.useState(false);
  const [refreshingData, setRefreshingData] = React.useState(false);

  const lead = business.leads[0];
  const location = business.locations.find((l) => l.isPrimary) ?? business.locations[0];
  const score = business.leadScores[0];
  const phone = business.contacts.find((c) => c.type === "PHONE")?.value;
  const whatsappHref = phone ? `https://wa.me/${phone.replace(/[^0-9]/g, "")}` : null;

  async function refetchBusiness() {
    const res = await fetch(`/api/businesses/${business.id}`);
    if (res.ok) setBusiness(await res.json());
  }

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
      await refetchBusiness();
      router.refresh();
    } catch {
      toast.error("Could not save this lead.");
    } finally {
      setSaving(false);
    }
  }

  async function handleStatusChange(status: LeadStatus) {
    if (!lead) return;
    setUpdatingStatus(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Status updated to ${LEAD_STATUS_LABEL[status]}.`);
      await refetchBusiness();
      router.refresh();
    } catch {
      toast.error("Could not update status.");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleAudit() {
    setAuditing(true);
    try {
      const res = await fetch(`/api/businesses/${business.id}/audit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Audit complete.");
      await refetchBusiness();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audit failed.");
    } finally {
      setAuditing(false);
    }
  }

  async function handleVerifyWebsite() {
    setVerifyingWebsite(true);
    try {
      const res = await fetch(`/api/businesses/${business.id}/verify-website`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      const { discovery } = data;
      if (discovery.status === "PRESENT") toast.success(`Website found: ${discovery.url} (via ${discovery.source}).`);
      else if (discovery.status === "CONFIRMED_NONE") toast.info(`No verified website found (checked via ${discovery.source}).`);
      else toast.info("Still can't confirm either way — try again once Google Places is configured for a more authoritative check.");
      await refetchBusiness();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Website verification failed.");
    } finally {
      setVerifyingWebsite(false);
    }
  }

  async function handleRefreshData() {
    setRefreshingData(true);
    try {
      const res = await fetch(`/api/businesses/${business.id}/refresh`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(data.message ?? "Business data refreshed.");
      await refetchBusiness();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not refresh business data.");
    } finally {
      setRefreshingData(false);
    }
  }

  async function handleGenerateAngle() {
    setGeneratingAngle(true);
    try {
      const res = await fetch(`/api/businesses/${business.id}/sales-angle`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setAngle(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate a sales angle.");
    } finally {
      setGeneratingAngle(false);
    }
  }

  async function handleGenerateDemo(style?: string) {
    setGeneratingDemo(true);
    try {
      const res = await fetch(`/api/businesses/${business.id}/demo`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(style ? { style } : {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Website concept generated.");
      router.push(`/demo/${data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not generate a demo.");
    } finally {
      setGeneratingDemo(false);
    }
  }

  async function handleAddNote(body: string) {
    if (!lead) return;
    const res = await fetch(`/api/leads/${lead.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.ok) {
      toast.success("Note added.");
      await refetchBusiness();
    } else {
      toast.error("Could not add note.");
    }
  }

  async function handleScheduleFollowUp(dueAt: string, note: string) {
    if (!lead) return;
    const res = await fetch(`/api/leads/${lead.id}/follow-ups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueAt, note: note || undefined }),
    });
    if (res.ok) {
      toast.success("Follow-up scheduled.");
      await refetchBusiness();
    } else {
      toast.error("Could not schedule follow-up.");
    }
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={business.name}
        description={undefined}
        actions={
          <div className="flex items-center gap-2">
            <PrepareForCallButton businessId={business.id} onDone={refetchBusiness} />
            {phone && (
              <Button variant="outline" asChild>
                <a href={`tel:${phone}`}>
                  <Phone className="size-4" /> Call
                </a>
              </Button>
            )}
            {whatsappHref && (
              <Button variant="outline" asChild>
                <a href={whatsappHref} target="_blank" rel="noreferrer">
                  <MessageCircle className="size-4" /> WhatsApp
                </a>
              </Button>
            )}
            {business.googleMapsUrl && (
              <Button variant="outline" asChild>
                <a href={business.googleMapsUrl} target="_blank" rel="noreferrer">
                  <MapPin className="size-4" /> Maps
                </a>
              </Button>
            )}
            {lead ? (
              <Select value={lead.status} onValueChange={(v) => handleStatusChange(v as LeadStatus)} disabled={updatingStatus}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEAD_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {LEAD_STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Button onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="animate-spin" /> : <BookmarkPlus />}
                Save Lead
              </Button>
            )}
          </div>
        }
      />

      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="capitalize">
            {business.categoryPrimary}
          </Badge>
          {business.rating && (
            <span className="flex items-center gap-1 text-sm">
              <Star className="size-4 fill-warning text-warning" />
              {business.rating.toFixed(1)} <span className="text-muted-foreground">({business.reviewCount} reviews)</span>
            </span>
          )}
          {location && (
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <MapPin className="size-4" />
              {[location.suburb, location.city, location.region].filter(Boolean).join(", ")}
            </span>
          )}
          {business.website && (
            <a href={business.website.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline">
              <Globe className="size-4" />
              {business.website.url.replace(/^https?:\/\//, "")}
              <ExternalLink className="size-3" />
            </a>
          )}
          <span className="text-xs text-muted-foreground">
            Source: {business.dataSource === "GOOGLE_PLACES" ? "Google Places API" : "OpenStreetMap"}
            {business.lastCheckedAt && ` · checked ${formatDate(business.lastCheckedAt)}`}
          </span>
          {business.lastCheckedAt && isDataStale(business.lastCheckedAt) && (
            <Badge variant="warning">Data needs refresh</Badge>
          )}
          <Button variant="ghost" size="sm" onClick={handleRefreshData} disabled={refreshingData} className="h-6 px-2 text-xs">
            {refreshingData ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
            Refresh Business Data
          </Button>
          {!business.website && (
            <Button variant="ghost" size="sm" onClick={handleVerifyWebsite} disabled={verifyingWebsite} className="h-6 px-2 text-xs">
              {verifyingWebsite ? <Loader2 className="size-3 animate-spin" /> : <Search className="size-3" />}
              Verify Website
            </Button>
          )}
        </div>

        {lead && (lead.estimatedValueMin || lead.estimatedValueMax) && (
          <div className="flex flex-wrap gap-4 rounded-lg border bg-muted/30 px-4 py-3 text-sm">
            <div>
              <span className="text-muted-foreground">Estimated project value: </span>
              <span className="font-medium">{formatCurrencyRange(lead.estimatedValueMin, lead.estimatedValueMax)}</span>
            </div>
            {lead.estimatedRecurringMin && (
              <div>
                <span className="text-muted-foreground">Possible recurring: </span>
                <span className="font-medium">{formatCurrencyRange(lead.estimatedRecurringMin, lead.estimatedRecurringMax)}/month</span>
              </div>
            )}
            <span className="text-xs text-muted-foreground">(Estimates based on your configured packages — not guaranteed figures)</span>
          </div>
        )}

        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="audit">Website Audit</TabsTrigger>
            <TabsTrigger value="angle">Sales Angle</TabsTrigger>
            <TabsTrigger value="concepts">Website Concepts{business.demos.length > 0 ? ` (${business.demos.length})` : ""}</TabsTrigger>
            <TabsTrigger value="timeline">Timeline & Notes</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <OpportunityScoreCard
              score={score?.score ?? null}
              quality={score?.quality ?? null}
              confidence={score?.confidence ?? null}
              reasons={(score?.reasonsJson as unknown as string[]) ?? []}
              breakdown={(score?.breakdownJson as unknown as ScoreBreakdown) ?? null}
              computedAt={score?.computedAt ?? null}
            />
            <ContactInfoCard contacts={business.contacts} location={location ?? null} openingHours={business.openingHoursJson as string[] | null} />
          </TabsContent>

          <TabsContent value="audit" className="mt-4">
            <WebsiteAuditPanel
              website={business.website}
              loading={auditing}
              onRunAudit={handleAudit}
              absenceStatus={business.websiteAbsenceStatus}
              websiteCheckedAt={business.websiteCheckedAt}
              websiteCheckSource={business.websiteCheckSource}
              verifying={verifyingWebsite}
              onVerifyWebsite={handleVerifyWebsite}
            />
          </TabsContent>

          <TabsContent value="angle" className="mt-4 space-y-4">
            <p className="text-sm text-muted-foreground">Personalized talking points for {repName ? repName.split(" ")[0] : "your"} next call.</p>
            <SalesAnglePanel angle={angle?.data ?? null} source={angle?.source ?? null} loading={generatingAngle} onGenerate={handleGenerateAngle} />
          </TabsContent>

          <TabsContent value="concepts" className="mt-4">
            <WebsiteConceptsPanel
              demos={business.demos}
              generating={generatingDemo}
              onGenerate={handleGenerateDemo}
              onChanged={refetchBusiness}
            />
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <TimelinePanel activities={business.activities} hasLead={Boolean(lead)} onAddNote={handleAddNote} onScheduleFollowUp={handleScheduleFollowUp} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
