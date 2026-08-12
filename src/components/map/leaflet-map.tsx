"use client";

import * as React from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import type { MapBusiness } from "@/types/map";

const QUALITY_COLOR: Record<string, string> = {
  HOT: "#e5484d",
  STRONG: "#f5a524",
  MEDIUM: "#e8d84a",
  LOW: "#8b8d98",
};

function pinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:16px;height:16px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
  });
}

function MapEvents({ onMoveEnd }: { onMoveEnd: (center: { lat: number; lng: number }, radiusMeters: number) => void }) {
  const map = useMapEvents({
    moveend: () => {
      const center = map.getCenter();
      const bounds = map.getBounds();
      const radius = center.distanceTo(bounds.getNorthEast());
      onMoveEnd({ lat: center.lat, lng: center.lng }, Math.round(radius));
    },
  });
  return null;
}

export function LeafletMap({
  businesses,
  onSelect,
  onMoveEnd,
  center,
}: {
  businesses: MapBusiness[];
  onSelect: (business: MapBusiness) => void;
  onMoveEnd: (center: { lat: number; lng: number }, radiusMeters: number) => void;
  center: { lat: number; lng: number };
}) {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={13} scrollWheelZoom style={{ height: "100%", width: "100%" }}>
      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <MapEvents onMoveEnd={onMoveEnd} />
      {businesses.map((b) => {
        const loc = b.locations[0];
        if (!loc?.latitude || !loc?.longitude) return null;
        const color = QUALITY_COLOR[b.leadScores[0]?.quality ?? "LOW"];
        return (
          <Marker key={b.id} position={[loc.latitude, loc.longitude]} icon={pinIcon(color)} eventHandlers={{ click: () => onSelect(b) }}>
            <Popup>
              <strong>{b.name}</strong>
              <br />
              {b.categoryPrimary}
              {b.leadScores[0] && (
                <>
                  <br />
                  Score: {b.leadScores[0].score}/100
                </>
              )}
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
