import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { runSearch } from "@/lib/services/search-service";

const searchSchema = z.object({
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  suburb: z.string().optional(),
  locationText: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radiusMeters: z.number().min(100).max(50000).optional(),
  category: z.string().optional(),
  keywords: z.string().optional(),
  limit: z.number().min(1).max(60).optional(),
  providerIds: z.array(z.enum(["GOOGLE_PLACES", "OPENSTREETMAP"])).optional(),
  saveSearch: z.boolean().optional(),
  searchName: z.string().optional(),
});

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = await req.json().catch(() => null);
  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid search parameters.", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await runSearch(userId, parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Search failed." }, { status: 500 });
  }
}
