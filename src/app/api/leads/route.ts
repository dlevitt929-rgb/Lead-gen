import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { saveLead, listLeads } from "@/lib/services/lead-service";
import type { LeadQuality, LeadStatus, WebsiteStatus } from "@prisma/client";

const saveSchema = z.object({ businessId: z.string() });

export async function POST(req: Request) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = await req.json().catch(() => null);
  const parsed = saveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "businessId is required." }, { status: 400 });

  try {
    const lead = await saveLead(userId, parsed.data.businessId);
    return NextResponse.json(lead);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not save lead." }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const url = new URL(req.url);
  const status = url.searchParams.getAll("status") as LeadStatus[];
  const quality = url.searchParams.getAll("quality") as LeadQuality[];
  const websiteStatus = url.searchParams.getAll("websiteStatus") as WebsiteStatus[];
  const search = url.searchParams.get("search") ?? undefined;
  const sortBy = (url.searchParams.get("sortBy") as "score" | "recent" | "value" | "nextAction" | null) ?? undefined;
  const sortDir = (url.searchParams.get("sortDir") as "asc" | "desc" | null) ?? undefined;
  const page = url.searchParams.get("page") ? Number(url.searchParams.get("page")) : undefined;
  const pageSize = url.searchParams.get("pageSize") ? Number(url.searchParams.get("pageSize")) : undefined;

  const result = await listLeads(userId, {
    status: status.length ? status : undefined,
    quality: quality.length ? quality : undefined,
    websiteStatus: websiteStatus.length ? websiteStatus : undefined,
    search,
    sortBy,
    sortDir: sortDir ?? undefined,
    page,
    pageSize,
  });

  return NextResponse.json(result);
}
