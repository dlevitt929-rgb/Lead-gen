import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { regenerateWebsiteConcept } from "@/lib/services/website-concept-service";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const style = typeof body.style === "string" ? body.style : undefined;

  try {
    const demo = await regenerateWebsiteConcept(id, userId, style);
    if (!demo) return NextResponse.json({ error: "Demo not found." }, { status: 404 });
    return NextResponse.json(demo);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not regenerate concept." }, { status: 500 });
  }
}
