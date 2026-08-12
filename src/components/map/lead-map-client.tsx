"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MapSidebar } from "@/components/map/map-sidebar";
import { CATEGORIES } from "@/lib/providers/categories";
import type { MapBusiness } from "@/types/map";

const LeafletMap = dynamic(() => import("@/components/map/leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" /> Loading map…
    </div>
  ),
});

const DEFAULT_CENTER = { lat: -33.9249, lng: 18.4241 }; // Cape Town CBD

export function LeadMapClient() {
  const [businesses, setBusinesses] = React.useState<MapBusiness[]>([]);
  const [selected, setSelected] = React.useState<MapBusiness | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [searching, setSearching] = React.useState(false);
  const [category, setCategory] = React.useState<string>("");
  const [currentView, setCurrentView] = React.useState<{ center: { lat: number; lng: number }; radiusMeters: number }>({
    center: DEFAULT_CENTER,
    radiusMeters: 5000,
  });

  const loadSaved = React.useCallback(async () => {
    const res = await fetch("/api/map");
    if (res.ok) {
      const data = await res.json();
      setBusinesses(data.businesses);
    }
    setLoading(false);
  }, []);

  React.useEffect(() => {
    loadSaved();
  }, [loadSaved]);

  async function searchThisArea() {
    setSearching(true);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          latitude: currentView.center.lat,
          longitude: currentView.center.lng,
          radiusMeters: Math.min(currentView.radiusMeters, 50000),
          category: category || undefined,
          limit: 40,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      if (data.warnings?.length) {
        data.warnings.forEach((w: { provider: string; message: string }) => toast.warning(`${w.provider}: ${w.message}`));
      }
      await loadSaved();
      toast.success(`Found ${data.businesses.length} businesses in this area.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="flex h-full">
      <div className="relative flex-1">
        <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-48 bg-card shadow">
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
          <Button size="sm" onClick={searchThisArea} disabled={searching} className="shadow">
            {searching ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Search this area
          </Button>
        </div>

        {!loading && (
          <LeafletMap
            businesses={businesses}
            center={currentView.center}
            onSelect={setSelected}
            onMoveEnd={(center, radiusMeters) => setCurrentView({ center, radiusMeters })}
          />
        )}
      </div>

      {selected && <MapSidebar business={selected} onClose={() => setSelected(null)} onSaved={loadSaved} />}
    </div>
  );
}
