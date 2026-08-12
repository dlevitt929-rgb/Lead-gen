import { NextResponse } from "next/server";

// Proxies Google Places Photos so the API key stays server-side. Website
// concepts (including public /preview/[token] pages, which are unauthenticated
// by design) reference images via this route rather than embedding a
// Google-signed URL with our key directly in HTML.
export async function GET(req: Request) {
  const key = process.env.GOOGLE_PLACES_API_KEY?.trim();
  if (!key) return NextResponse.json({ error: "Google Places is not configured." }, { status: 503 });

  const { searchParams } = new URL(req.url);
  const ref = searchParams.get("ref");
  if (!ref) return NextResponse.json({ error: "Missing photo reference." }, { status: 400 });

  const width = Math.min(Math.max(Number(searchParams.get("w")) || 800, 100), 1600);
  const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${width}&photo_reference=${encodeURIComponent(ref)}&key=${key}`;

  const upstream = await fetch(url, { redirect: "follow" });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Could not fetch photo." }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
