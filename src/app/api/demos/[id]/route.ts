import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { renameWebsiteConcept, updateWebsiteConceptContent } from "@/lib/services/website-concept-service";
import type { WebsiteConcept } from "@/lib/services/website-concept-types";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const demo = await db.demo.findFirst({ where: { id, userId }, include: { business: true } });
  if (!demo) return NextResponse.json({ error: "Demo not found." }, { status: 404 });
  return NextResponse.json(demo);
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  if (typeof body.title === "string" && body.title.trim()) {
    const demo = await renameWebsiteConcept(id, userId, body.title.trim());
    if (!demo) return NextResponse.json({ error: "Demo not found." }, { status: 404 });
    return NextResponse.json(demo);
  }

  if (body.contentJson) {
    const demo = await updateWebsiteConceptContent(id, userId, body.contentJson as WebsiteConcept);
    if (!demo) return NextResponse.json({ error: "Demo not found." }, { status: 404 });
    return NextResponse.json(demo);
  }

  return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const demo = await db.demo.findFirst({ where: { id, userId } });
  if (!demo) return NextResponse.json({ error: "Demo not found." }, { status: 404 });
  await db.demo.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
