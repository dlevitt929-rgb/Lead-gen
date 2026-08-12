import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const demo = await db.demo.findFirst({ where: { id, userId }, include: { business: true } });
  if (!demo) return NextResponse.json({ error: "Demo not found." }, { status: 404 });
  return NextResponse.json(demo);
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
