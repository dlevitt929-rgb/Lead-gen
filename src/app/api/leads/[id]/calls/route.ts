import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { logCall } from "@/lib/services/crm-service";
import { CallOutcome } from "@prisma/client";

const schema = z.object({
  outcome: z.enum(CallOutcome),
  notes: z.string().max(4000).optional(),
  durationSeconds: z.number().min(0).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid call outcome." }, { status: 400 });

  try {
    const call = await logCall({ userId, leadId: id, ...parsed.data });
    return NextResponse.json(call);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not log call." }, { status: 500 });
  }
}
