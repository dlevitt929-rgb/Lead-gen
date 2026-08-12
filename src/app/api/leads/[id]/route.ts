import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { getLeadDetail, updateLeadStatus, setNextAction } from "@/lib/services/lead-service";
import { db } from "@/lib/db";
import { LeadStatus } from "@prisma/client";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const lead = await getLeadDetail(userId, id);
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });
  return NextResponse.json(lead);
}

const patchSchema = z.object({
  status: z.enum(LeadStatus).optional(),
  nextActionAt: z.string().datetime().nullable().optional(),
  nextActionNote: z.string().nullable().optional(),
});

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid update." }, { status: 400 });

  try {
    if (parsed.data.status) {
      await updateLeadStatus(userId, id, parsed.data.status);
    }
    if (parsed.data.nextActionAt !== undefined) {
      await setNextAction(
        userId,
        id,
        parsed.data.nextActionAt ? new Date(parsed.data.nextActionAt) : null,
        parsed.data.nextActionNote ?? undefined,
      );
    }
    const updated = await getLeadDetail(userId, id);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Update failed." }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const lead = await db.lead.findFirst({ where: { id, userId } });
  if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

  await db.lead.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
