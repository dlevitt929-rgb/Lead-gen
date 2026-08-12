import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { discoverWebsite } from "@/lib/services/website-discovery-service";
import { recomputeLeadScore } from "@/lib/services/scoring-service";
import { db } from "@/lib/db";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  try {
    const discovery = await discoverWebsite(id);
    const scoreResult = await recomputeLeadScore(id);

    const lead = await db.lead.findUnique({ where: { userId_businessId: { userId, businessId: id } } });
    if (lead) {
      await db.activity.create({
        data: {
          userId,
          businessId: id,
          leadId: lead.id,
          type: "STATUS_CHANGED",
          message:
            discovery.status === "PRESENT"
              ? `Website verified: ${discovery.url} (via ${discovery.source}).`
              : discovery.status === "CONFIRMED_NONE"
                ? `No verified website found (checked via ${discovery.source}).`
                : `Website presence still unknown after check (${discovery.source}).`,
        },
      });
    }

    return NextResponse.json({ discovery, scoreResult });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Website verification failed." }, { status: 500 });
  }
}
