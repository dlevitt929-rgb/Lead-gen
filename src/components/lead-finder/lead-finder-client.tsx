"use client";

import * as React from "react";
import { toast } from "sonner";
import { AlertTriangle, SearchX, Sparkles, BookmarkPlus, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SearchForm, DEFAULT_SEARCH_VALUES, type SearchFormValues } from "@/components/lead-finder/search-form";
import { ResultsTable } from "@/components/lead-finder/results-table";
import { formatRelativeTime } from "@/lib/utils";
import type { DataSourceId } from "@/lib/providers/types";
import type { SearchResponse, SearchResultRow } from "@/types/search";

interface SavedSearch {
  id: string;
  name: string | null;
  lastRunAt: string;
  paramsJson: Partial<SearchFormValues>;
}

export function LeadFinderClient({ configuredProviders }: { configuredProviders: DataSourceId[] }) {
  const [loading, setLoading] = React.useState(false);
  const [hasSearched, setHasSearched] = React.useState(false);
  const [rows, setRows] = React.useState<SearchResultRow[]>([]);
  const [warnings, setWarnings] = React.useState<{ provider: string; message: string }[]>([]);
  const [savingIds, setSavingIds] = React.useState<Set<string>>(new Set());
  const [auditingIds, setAuditingIds] = React.useState<Set<string>>(new Set());
  const [lastValues, setLastValues] = React.useState<SearchFormValues | null>(null);
  const [savedSearches, setSavedSearches] = React.useState<SavedSearch[]>([]);
  const [showSaveInput, setShowSaveInput] = React.useState(false);
  const [saveName, setSaveName] = React.useState("");
  const [rerunValues, setRerunValues] = React.useState<SearchFormValues | null>(null);

  const loadSavedSearches = React.useCallback(async () => {
    const res = await fetch("/api/searches");
    if (res.ok) {
      const data = await res.json();
      setSavedSearches(data.searches);
    }
  }, []);

  React.useEffect(() => {
    loadSavedSearches();
  }, [loadSavedSearches]);

  async function runSearch(values: SearchFormValues, opts?: { saveSearch?: boolean; searchName?: string }) {
    setLoading(true);
    setHasSearched(true);
    setLastValues(values);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: values.category || undefined,
          keywords: values.keywords || undefined,
          country: values.country || undefined,
          region: values.region || undefined,
          city: values.city || undefined,
          suburb: values.suburb || undefined,
          radiusMeters: values.radiusMeters,
          limit: values.limit,
          providerIds: values.providerIds,
          saveSearch: opts?.saveSearch,
          searchName: opts?.searchName,
        }),
      });
      const data = (await res.json()) as SearchResponse & { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Search failed.");
        setRows([]);
        setWarnings([]);
        return;
      }

      let filtered = data.businesses;
      if (values.minRating > 0) filtered = filtered.filter((r) => (r.business.rating ?? 0) >= values.minRating);
      if (values.minReviews > 0) filtered = filtered.filter((r) => (r.business.reviewCount ?? 0) >= values.minReviews);

      setRows(filtered);
      setWarnings(data.warnings);
      if (filtered.length === 0 && data.warnings.length === 0) {
        toast.info("No businesses found for this search — try widening the radius or category.");
      }
      if (opts?.saveSearch) {
        toast.success("Search saved — rerun it anytime from Saved Searches.");
        loadSavedSearches();
      }
    } catch {
      toast.error("Something went wrong reaching the search service.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(businessId: string) {
    setSavingIds((s) => new Set(s).add(businessId));
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      if (!res.ok) throw new Error();
      setRows((rs) => rs.map((r) => (r.business.id === businessId ? { ...r, isSaved: true } : r)));
      toast.success("Lead saved to your Opportunities.");
    } catch {
      toast.error("Could not save this lead.");
    } finally {
      setSavingIds((s) => {
        const next = new Set(s);
        next.delete(businessId);
        return next;
      });
    }
  }

  async function handleAudit(businessId: string) {
    setAuditingIds((s) => new Set(s).add(businessId));
    try {
      const res = await fetch(`/api/businesses/${businessId}/audit`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setRows((rs) =>
        rs.map((r) =>
          r.business.id === businessId
            ? { ...r, score: data.scoreResult.score, quality: data.scoreResult.quality, website: r.website ? { ...r.website, status: data.status } : r.website }
            : r,
        ),
      );
      toast.success("Website audit complete — score updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Audit failed.");
    } finally {
      setAuditingIds((s) => {
        const next = new Set(s);
        next.delete(businessId);
        return next;
      });
    }
  }

  return (
    <div className="space-y-5 p-6">
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Saved Searches {savedSearches.length > 0 && `(${savedSearches.length})`}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel>Rerun a saved search</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {savedSearches.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No saved searches yet.</p>
            ) : (
              savedSearches.map((s) => (
                <DropdownMenuItem
                  key={s.id}
                  onSelect={() => {
                    const values: SearchFormValues = { ...DEFAULT_SEARCH_VALUES, ...s.paramsJson, providerIds: s.paramsJson.providerIds ?? DEFAULT_SEARCH_VALUES.providerIds };
                    setRerunValues(values);
                    runSearch(values);
                  }}
                >
                  <Play className="size-3.5" />
                  <div className="flex flex-col">
                    <span>{s.name || "Untitled search"}</span>
                    <span className="text-xs text-muted-foreground">Last run {formatRelativeTime(s.lastRunAt)}</span>
                  </div>
                </DropdownMenuItem>
              ))
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <Card>
        <CardContent className="pt-5">
          <SearchForm onSearch={(v) => runSearch(v)} loading={loading} configuredProviders={configuredProviders} initialValues={rerunValues ?? undefined} />
        </CardContent>
      </Card>

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w, i) => (
            <div key={i} className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
              <span>
                <strong>{w.provider}:</strong> {w.message}
              </span>
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      )}

      {!loading && hasSearched && rows.length > 0 && (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{rows.length} businesses found</p>
            {showSaveInput ? (
              <div className="flex items-center gap-2">
                <Input placeholder="e.g. Cape Town Dentists" value={saveName} onChange={(e) => setSaveName(e.target.value)} className="h-8 w-52" />
                <Button
                  size="sm"
                  disabled={!saveName.trim() || !lastValues}
                  onClick={() => {
                    if (lastValues) runSearch(lastValues, { saveSearch: true, searchName: saveName });
                    setShowSaveInput(false);
                    setSaveName("");
                  }}
                >
                  Save
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowSaveInput(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setShowSaveInput(true)}>
                <BookmarkPlus className="size-3.5" /> Save this search
              </Button>
            )}
          </div>
          <ResultsTable rows={rows} savingIds={savingIds} auditingIds={auditingIds} onSave={handleSave} onAudit={handleAudit} />
        </>
      )}

      {!loading && hasSearched && rows.length === 0 && warnings.length === 0 && (
        <EmptyState
          icon={SearchX}
          title="No businesses found"
          description="Try a wider radius, a broader category, or a different suburb — real results depend on what's actually mapped for this area."
        />
      )}

      {!loading && !hasSearched && (
        <EmptyState
          icon={Sparkles}
          title="Find your next customers"
          description="Search real businesses by category and location. LeadForge scores every result as a website-development opportunity so you know exactly who to call first."
        />
      )}
    </div>
  );
}
