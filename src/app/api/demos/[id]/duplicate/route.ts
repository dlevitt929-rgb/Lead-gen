import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { duplicateWebsiteConcept } from "@/lib/services/website-concept-service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const demo = await duplicateWebsiteConcept(id, userId);
  if (!demo) return NextResponse.json({ error: "Demo not found." }, { status: 404 });
  return NextResponse.json(demo);
}
