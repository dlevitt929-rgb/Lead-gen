import { z } from "zod";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { runSearch, type SearchProgressEvent } from "@/lib/services/search-service";

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

/**
 * Streams newline-delimited JSON progress events while the search runs, then
 * a final `result` event — this is what powers the step-by-step "Searching
 * businesses… ✓ Connecting… ✓ 18 found…" UI instead of a single opaque
 * spinner that can sit for 10-60s with no feedback while dozens of
 * businesses are persisted and scored.
 */
export async function POST(req: Request) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = await req.json().catch(() => null);
  const parsed = searchSchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ type: "error", message: "Invalid search parameters." }) + "\n", {
      status: 400,
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: SearchProgressEvent | { type: "result" | "error"; [key: string]: unknown }) => {
        if (closed) return;
        controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      };

      try {
        const result = await runSearch(userId, parsed.data, (event) => send(event));
        send({ type: "result", ...result });
      } catch (err) {
        console.error("[api/search] search failed:", err);
        send({ type: "error", message: err instanceof Error ? err.message : "Search failed." });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
