import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { prepareForCall } from "@/lib/services/call-queue-service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  try {
    const result = await prepareForCall(userId, id);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not prepare this lead for a call." }, { status: 500 });
  }
}
