import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { refreshBusinessData } from "@/lib/services/business-refresh-service";
import { recomputeLeadScore } from "@/lib/services/scoring-service";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  try {
    const result = await refreshBusinessData(id);
    const scoreResult = result.refreshed ? await recomputeLeadScore(id) : null;

    const lead = await db.lead.findUnique({ where: { userId_businessId: { userId, businessId: id } } });
    if (lead && result.refreshed) {
      await db.activity.create({
        data: { userId, businessId: id, leadId: lead.id, type: "STATUS_CHANGED", message: `Business data refreshed. ${result.message}` },
      });
    }

    return NextResponse.json({ ...result, scoreResult });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Refresh failed." }, { status: 500 });
  }
}
