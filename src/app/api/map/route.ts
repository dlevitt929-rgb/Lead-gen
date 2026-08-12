import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { listDiscoveredBusinesses } from "@/lib/services/business-service";

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const businesses = await listDiscoveredBusinesses(userId);
  const withLocation = businesses.filter((b) => b.locations[0]?.latitude && b.locations[0]?.longitude);
  return NextResponse.json({ businesses: withLocation });
}
