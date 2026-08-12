import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { applyAiEditCommand } from "@/lib/services/website-copy-generator";
import type { WebsiteConcept } from "@/lib/services/website-concept-types";
import type { Prisma } from "@prisma/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const { pageId, sectionId, instruction } = body as { pageId?: string; sectionId?: string; instruction?: string };
  if (!pageId || !sectionId || !instruction) {
    return NextResponse.json({ error: "pageId, sectionId and instruction are required." }, { status: 400 });
  }

  const demo = await db.demo.findFirst({ where: { id, userId } });
  if (!demo) return NextResponse.json({ error: "Demo not found." }, { status: 404 });

  const concept = demo.contentJson as unknown as WebsiteConcept;
  const page = concept.pages.find((p) => p.id === pageId);
  const section = page?.sections.find((s) => s.id === sectionId);
  if (!page || !section) return NextResponse.json({ error: "Section not found." }, { status: 404 });

  const result = await applyAiEditCommand(section.type, section.data, instruction);
  if (!result.applied) {
    return NextResponse.json({ applied: false, message: result.message }, { status: 200 });
  }

  section.data = result.data;
  const updated = await db.demo.update({ where: { id }, data: { contentJson: concept as unknown as Prisma.InputJsonValue } });

  return NextResponse.json({ applied: true, demo: updated });
}
