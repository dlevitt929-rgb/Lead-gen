import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { addNote } from "@/lib/services/crm-service";

const schema = z.object({ body: z.string().min(1).max(4000) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Note body is required." }, { status: 400 });

  try {
    const note = await addNote(userId, id, parsed.data.body);
    return NextResponse.json(note);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not add note." }, { status: 500 });
  }
}
