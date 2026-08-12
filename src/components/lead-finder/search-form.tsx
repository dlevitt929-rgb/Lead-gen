"use client";

import * as React from "react";
import { Search, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { CATEGORIES } from "@/lib/providers/categories";
import type { DataSourceId } from "@/lib/providers/types";

export interface SearchFormValues {
  category: string;
  keywords: string;
  country: string;
  region: string;
  city: string;
  suburb: string;
  radiusMeters: number;
  minRating: number;
  minReviews: number;
  limit: number;
  providerIds: DataSourceId[];
}

export const DEFAULT_SEARCH_VALUES: SearchFormValues = {
  category: "",
  keywords: "",
  country: "South Africa",
  region: "",
  city: "Cape Town",
  suburb: "",
  radiusMeters: 8000,
  minRating: 0,
  minReviews: 0,
  limit: 25,
  providerIds: ["OPENSTREETMAP", "GOOGLE_PLACES"],
};

const RADIUS_OPTIONS = [
  { value: 1000, label: "1 km" },
  { value: 2000, label: "2 km" },
  { value: 5000, label: "5 km" },
  { value: 8000, label: "8 km" },
  { value: 15000, label: "15 km" },
  { value: 25000, label: "25 km" },
  { value: 50000, label: "50 km" },
];

export function SearchForm({
  onSearch,
  loading,
  configuredProviders,
  initialValues,
}: {
  onSearch: (values: SearchFormValues) => void;
  loading: boolean;
  configuredProviders: DataSourceId[];
  initialValues?: SearchFormValues;
}) {
  const [values, setValues] = React.useState<SearchFormValues>(initialValues ?? DEFAULT_SEARCH_VALUES);
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  React.useEffect(() => {
    if (initialValues) setValues(initialValues);
  }, [initialValues]);

  function update<K extends keyof SearchFormValues>(key: K, value: SearchFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function toggleProvider(id: DataSourceId) {
    setValues((v) => ({
      ...v,
      providerIds: v.providerIds.includes(id) ? v.providerIds.filter((p) => p !== id) : [...v.providerIds, id],
    }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(values);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <Select value={values.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger id="category">
              <SelectValue placeholder="Any category" />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="keywords">Keywords</Label>
          <Input
            id="keywords"
            placeholder="e.g. 24 hour, family owned"
            value={values.keywords}
            onChange={(e) => update("keywords", e.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="city">City</Label>
          <Input id="city" placeholder="Cape Town" value={values.city} onChange={(e) => update("city", e.target.value)} required />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="suburb">Suburb (optional)</Label>
          <Input id="suburb" placeholder="Green Point" value={values.suburb} onChange={(e) => update("suburb", e.target.value)} />
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        {advancedOpen ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        Advanced filters
      </button>

      {advancedOpen && (
        <div className="grid grid-cols-1 gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor="region">Province / State</Label>
            <Input id="region" placeholder="Western Cape" value={values.region} onChange={(e) => update("region", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="country">Country</Label>
            <Input id="country" value={values.country} onChange={(e) => update("country", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="radius">Radius</Label>
            <Select value={String(values.radiusMeters)} onValueChange={(v) => update("radiusMeters", Number(v))}>
              <SelectTrigger id="radius">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={String(r.value)}>
                    Within {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="limit">Max results</Label>
            <Select value={String(values.limit)} onValueChange={(v) => update("limit", Number(v))}>
              <SelectTrigger id="limit">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[10, 20, 25, 40, 60].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n} results
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="minRating">Minimum rating</Label>
            <Select value={String(values.minRating)} onValueChange={(v) => update("minRating", Number(v))}>
              <SelectTrigger id="minRating">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Any rating</SelectItem>
                {[3, 3.5, 4, 4.5].map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    {n}+ stars
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="minReviews">Minimum reviews</Label>
            <Input
              id="minReviews"
              type="number"
              min={0}
              value={values.minReviews}
              onChange={(e) => update("minReviews", Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
            <Label>Data sources</Label>
            <div className="flex flex-wrap items-center gap-4 pt-1">
              {(["OPENSTREETMAP", "GOOGLE_PLACES"] as DataSourceId[]).map((id) => (
                <label key={id} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={values.providerIds.includes(id)} onCheckedChange={() => toggleProvider(id)} />
                  {id === "OPENSTREETMAP" ? "OpenStreetMap" : "Google Places"}
                  {!configuredProviders.includes(id) && <span className="text-xs text-muted-foreground">(not configured)</span>}
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-1">
        <p className="text-xs text-muted-foreground">
          Real businesses only — every result comes from a live provider search, never sample data.
        </p>
        <Button type="submit" disabled={loading}>
          {loading ? <Loader2 className="animate-spin" /> : <Search />}
          {loading ? "Searching…" : "Search businesses"}
        </Button>
      </div>
    </form>
  );
}
