"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Search, Download, Loader2, Target, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoreBadge } from "@/components/shared/score-badge";
import { WebsiteStatusBadge } from "@/components/shared/website-status-badge";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyRange, formatRelativeTime } from "@/lib/utils";
import { LEAD_STATUSES, LEAD_STATUS_LABEL } from "@/lib/lead-status";
import { toCsv, downloadCsv } from "@/lib/csv";
import type { OpportunitiesResponse, OpportunityRow } from "@/types/lead";
import type { LeadQuality, LeadStatus, WebsiteStatus } from "@prisma/client";

const QUALITY_OPTIONS: LeadQuality[] = ["HOT", "STRONG", "MEDIUM", "LOW"];
const WEBSITE_OPTIONS: { value: WebsiteStatus; label: string }[] = [
  { value: "NONE", label: "No website" },
  { value: "POOR", label: "Poor website" },
  { value: "AVERAGE", label: "Average website" },
  { value: "GOOD", label: "Good website" },
];

export function OpportunitiesClient() {
  const [data, setData] = React.useState<OpportunitiesResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<Set<LeadStatus>>(new Set());
  const [qualityFilter, setQualityFilter] = React.useState<Set<LeadQuality>>(new Set());
  const [websiteFilter, setWebsiteFilter] = React.useState<Set<WebsiteStatus>>(new Set());
  const [sortBy, setSortBy] = React.useState("score");
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(1);
  const [bulkUpdating, setBulkUpdating] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    statusFilter.forEach((s) => params.append("status", s));
    qualityFilter.forEach((q) => params.append("quality", q));
    websiteFilter.forEach((w) => params.append("websiteStatus", w));
    params.set("sortBy", sortBy);
    params.set("sortDir", "desc");
    params.set("page", String(page));

    const res = await fetch(`/api/leads?${params.toString()}`);
    if (res.ok) setData(await res.json());
    setLoading(false);
  }, [search, statusFilter, qualityFilter, websiteFilter, sortBy, page]);

  React.useEffect(() => {
    load();
  }, [load]);

  function toggleSet<T>(set: Set<T>, value: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
    setPage(1);
  }

  function toggleRow(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  function toggleAll() {
    if (!data) return;
    if (selected.size === data.leads.length) setSelected(new Set());
    else setSelected(new Set(data.leads.map((l) => l.id)));
  }

  async function bulkChangeStatus(status: LeadStatus) {
    setBulkUpdating(true);
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          fetch(`/api/leads/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          }),
        ),
      );
      toast.success(`${selected.size} lead${selected.size > 1 ? "s" : ""} updated to ${LEAD_STATUS_LABEL[status]}.`);
      setSelected(new Set());
      await load();
    } catch {
      toast.error("Some updates failed.");
    } finally {
      setBulkUpdating(false);
    }
  }

  function exportCsv(rows: OpportunityRow[]) {
    const csv = toCsv(
      rows.map((r) => ({
        score: r.business.leadScores[0]?.score ?? "",
        business: r.business.name,
        industry: r.business.categoryPrimary,
        location: [r.business.locations[0]?.suburb, r.business.locations[0]?.city].filter(Boolean).join(", "),
        rating: r.business.rating ?? "",
        reviews: r.business.reviewCount ?? "",
        website: r.business.website?.url ?? "",
        websiteQuality: r.business.website?.status ?? "none",
        phone: r.business.contacts.find((c) => c.type === "PHONE")?.value ?? "",
        email: r.business.contacts.find((c) => c.type === "EMAIL")?.value ?? "",
        status: r.status,
        lastContacted: r.lastContactedAt ?? "",
        nextAction: r.nextActionAt ?? "",
        estimatedValueMin: r.estimatedValueMin ?? "",
        estimatedValueMax: r.estimatedValueMax ?? "",
      })),
      [
        { key: "score", label: "Score" },
        { key: "business", label: "Business" },
        { key: "industry", label: "Industry" },
        { key: "location", label: "Location" },
        { key: "rating", label: "Rating" },
        { key: "reviews", label: "Reviews" },
        { key: "website", label: "Website" },
        { key: "websiteQuality", label: "Website Quality" },
        { key: "phone", label: "Phone" },
        { key: "email", label: "Email" },
        { key: "status", label: "Status" },
        { key: "lastContacted", label: "Last Contacted" },
        { key: "nextAction", label: "Next Action" },
        { key: "estimatedValueMin", label: "Estimated Value Min" },
        { key: "estimatedValueMax", label: "Estimated Value Max" },
      ],
    );
    downloadCsv(`leadforge-opportunities-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  const rows = data?.leads ?? [];
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute top-2.5 left-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search business or industry…"
            className="w-64 pl-8"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Status {statusFilter.size > 0 && `(${statusFilter.size})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="max-h-80 overflow-y-auto">
            <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {LEAD_STATUSES.map((s) => (
              <DropdownMenuCheckboxItem key={s} checked={statusFilter.has(s)} onCheckedChange={() => toggleSet(statusFilter, s, setStatusFilter)}>
                {LEAD_STATUS_LABEL[s]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Lead quality {qualityFilter.size > 0 && `(${qualityFilter.size})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by quality</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {QUALITY_OPTIONS.map((q) => (
              <DropdownMenuCheckboxItem key={q} checked={qualityFilter.has(q)} onCheckedChange={() => toggleSet(qualityFilter, q, setQualityFilter)}>
                {q.charAt(0) + q.slice(1).toLowerCase()}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Website status {websiteFilter.size > 0 && `(${websiteFilter.size})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuLabel>Filter by website</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {WEBSITE_OPTIONS.map((w) => (
              <DropdownMenuCheckboxItem key={w.value} checked={websiteFilter.has(w.value)} onCheckedChange={() => toggleSet(websiteFilter, w.value, setWebsiteFilter)}>
                {w.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="score">Sort: Highest score</SelectItem>
            <SelectItem value="recent">Sort: Recently updated</SelectItem>
            <SelectItem value="value">Sort: Highest value</SelectItem>
            <SelectItem value="nextAction">Sort: Next action</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex-1" />
        <Button variant="outline" size="sm" onClick={() => exportCsv(rows)} disabled={rows.length === 0}>
          <Download className="size-3.5" /> Export CSV
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border bg-accent px-4 py-2.5 text-sm">
          <span className="font-medium">{selected.size} selected</span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="secondary" disabled={bulkUpdating}>
                {bulkUpdating && <Loader2 className="size-3.5 animate-spin" />}
                Change status
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {LEAD_STATUSES.map((s) => (
                <DropdownMenuCheckboxItem key={s} checked={false} onCheckedChange={() => bulkChangeStatus(s)}>
                  {LEAD_STATUS_LABEL[s]}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" variant="ghost" onClick={() => exportCsv(rows.filter((r) => selected.has(r.id)))}>
            Export selected
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No opportunities yet"
          description="Save leads from Lead Finder or the Lead Map to start building your pipeline."
          action={
            <Button asChild>
              <Link href="/lead-finder">Find leads</Link>
            </Button>
          }
        />
      ) : (
        <>
          <div className="overflow-hidden rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox checked={rows.length > 0 && selected.size === rows.length} onCheckedChange={toggleAll} />
                  </TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Business</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Website</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last contacted</TableHead>
                  <TableHead>Next action</TableHead>
                  <TableHead>Est. value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const score = row.business.leadScores[0];
                  const phone = row.business.contacts.find((c) => c.type === "PHONE")?.value;
                  return (
                    <TableRow key={row.id} data-state={selected.has(row.id) ? "selected" : undefined}>
                      <TableCell>
                        <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleRow(row.id)} />
                      </TableCell>
                      <TableCell>{score ? <ScoreBadge score={score.score} quality={score.quality} size="sm" /> : "—"}</TableCell>
                      <TableCell className="max-w-48 whitespace-normal font-medium">
                        <Link href={`/business/${row.business.id}`} className="hover:underline">
                          {row.business.name}
                        </Link>
                        <div className="mt-1 flex flex-wrap gap-1">
                          {row.tags.map((t) => (
                            <Badge key={t.tag.id} variant="outline" className="text-[10px]">
                              {t.tag.name}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="capitalize text-muted-foreground">{row.business.categoryPrimary}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {[row.business.locations[0]?.suburb, row.business.locations[0]?.city].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell>{row.business.rating ? `${row.business.rating.toFixed(1)} (${row.business.reviewCount})` : "—"}</TableCell>
                      <TableCell>
                        <WebsiteStatusBadge website={row.business.website} />
                      </TableCell>
                      <TableCell className="text-muted-foreground">{phone ?? "—"}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{LEAD_STATUS_LABEL[row.status]}</Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatRelativeTime(row.lastContactedAt)}</TableCell>
                      <TableCell className="text-muted-foreground">{row.nextActionAt ? formatRelativeTime(row.nextActionAt) : "—"}</TableCell>
                      <TableCell className="text-muted-foreground">{formatCurrencyRange(row.estimatedValueMin, row.estimatedValueMax)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                Page {page} of {totalPages} ({data?.total} leads)
              </span>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button size="icon" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
