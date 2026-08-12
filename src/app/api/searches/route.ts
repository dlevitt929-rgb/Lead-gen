import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { db } from "@/lib/db";

export async function GET() {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const searches = await db.search.findMany({
    where: { userId, isSaved: true },
    orderBy: { lastRunAt: "desc" },
  });
  return NextResponse.json({ searches });
}
