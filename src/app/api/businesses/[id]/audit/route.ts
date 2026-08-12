import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { runAndSaveAudit, NoWebsiteKnownError } from "@/lib/services/audit-service";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  try {
    const result = await runAndSaveAudit(id);
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof NoWebsiteKnownError) {
      return NextResponse.json({ error: err.message, code: "NO_WEBSITE_KNOWN" }, { status: 409 });
    }
    console.error(`[api/businesses/${id}/audit] audit failed:`, err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Audit failed." }, { status: 500 });
  }
}
