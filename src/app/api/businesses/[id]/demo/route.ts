import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { createWebsiteConcept, BusinessNotFoundError } from "@/lib/services/website-concept-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const style = typeof body.style === "string" ? body.style : undefined;

  const lead = await db.lead.findUnique({ where: { userId_businessId: { userId, businessId: id } } });

  try {
    const demo = await createWebsiteConcept({ userId, businessId: id, leadId: lead?.id, style });
    return NextResponse.json(demo);
  } catch (err) {
    if (err instanceof BusinessNotFoundError) return NextResponse.json({ error: err.message }, { status: 404 });
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not generate website concept." }, { status: 500 });
  }
}
