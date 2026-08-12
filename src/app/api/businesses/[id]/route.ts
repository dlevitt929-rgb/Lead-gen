import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { getBusinessDetail } from "@/lib/services/business-service";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const business = await getBusinessDetail(id, userId);
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });
  return NextResponse.json(business);
}
