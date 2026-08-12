import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { scheduleFollowUp } from "@/lib/services/crm-service";

const schema = z.object({ dueAt: z.string().datetime(), note: z.string().max(1000).optional() });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "A valid due date is required." }, { status: 400 });

  try {
    const followUp = await scheduleFollowUp(userId, id, new Date(parsed.data.dueAt), parsed.data.note);
    return NextResponse.json(followUp);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not schedule follow-up." }, { status: 500 });
  }
}
