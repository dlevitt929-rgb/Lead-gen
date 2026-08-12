import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { addTagToLead, removeTagFromLead } from "@/lib/services/crm-service";

const schema = z.object({ name: z.string().min(1).max(40), color: z.string().optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Tag name is required." }, { status: 400 });

  try {
    const tag = await addTagToLead(userId, id, parsed.data.name, parsed.data.color);
    return NextResponse.json(tag);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not add tag." }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const url = new URL(req.url);
  const tagId = url.searchParams.get("tagId");
  if (!tagId) return NextResponse.json({ error: "tagId is required." }, { status: 400 });

  try {
    await removeTagFromLead(userId, id, tagId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not remove tag." }, { status: 500 });
  }
}
