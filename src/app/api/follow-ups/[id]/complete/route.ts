import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { completeFollowUp } from "@/lib/services/crm-service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  try {
    const followUp = await completeFollowUp(userId, id);
    return NextResponse.json(followUp);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not complete follow-up." }, { status: 500 });
  }
}
