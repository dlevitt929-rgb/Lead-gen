import { NextResponse } from "next/server";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { db } from "@/lib/db";
import { generateDemoConcept } from "@/lib/services/demo-generator";
import type { Prisma } from "@prisma/client";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const { id } = await params;
  const business = await db.business.findUnique({
    where: { id },
    include: { locations: { where: { isPrimary: true }, take: 1 }, contacts: true, website: true },
  });
  if (!business) return NextResponse.json({ error: "Business not found." }, { status: 404 });

  const phone = business.contacts.find((c) => c.type === "PHONE")?.value;
  const location = business.locations[0];
  const lead = await db.lead.findUnique({ where: { userId_businessId: { userId, businessId: id } } });

  const concept = generateDemoConcept({
    businessName: business.name,
    categoryPrimary: business.categoryPrimary,
    description: business.description,
    addressFormatted: location?.addressFormatted,
    city: location?.city,
    suburb: location?.suburb,
    phone,
    website: business.website?.url,
    rating: business.rating,
    reviewCount: business.reviewCount,
    openingHours: (business.openingHoursJson as string[] | null) ?? undefined,
  });

  const demo = await db.demo.create({
    data: {
      leadId: lead?.id,
      businessId: business.id,
      userId,
      title: `${business.name} — Website Concept`,
      contentJson: concept as unknown as Prisma.InputJsonValue,
    },
  });

  if (lead) {
    await db.activity.create({
      data: {
        userId,
        leadId: lead.id,
        businessId: business.id,
        type: "DEMO_GENERATED",
        message: `Website concept generated for ${business.name}.`,
      },
    });
  }

  return NextResponse.json(demo);
}
