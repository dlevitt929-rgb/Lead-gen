import crypto from "node:crypto";
import { db } from "@/lib/db";
import { planWebsite } from "@/lib/services/website-planner";
import { generateCopy } from "@/lib/services/website-copy-generator";
import { defaultStyleForCategory, generateTheme, isWebsiteStyle } from "@/lib/services/website-design-generator";
import { buildBusinessImages } from "@/lib/services/business-image-service";
import type { WebsiteConcept, WebsiteStyle } from "@/lib/services/website-concept-types";
import type { BusinessPhotoRef } from "@/lib/providers/types";
import type { Prisma } from "@prisma/client";

// Orchestrates the full generator pipeline (plan -> copy -> design -> images)
// into one structured WebsiteConcept, and owns persistence into the Demo
// table (which stores one row per generated concept, so a lead can have
// several — see the "Website Concepts" tab).

export class BusinessNotFoundError extends Error {
  constructor() {
    super("Business not found.");
    this.name = "BusinessNotFoundError";
  }
}

function generatePreviewToken() {
  return crypto.randomBytes(24).toString("base64url");
}

export async function buildConceptForBusiness(businessId: string, style?: WebsiteStyle): Promise<WebsiteConcept> {
  const business = await db.business.findUnique({
    where: { id: businessId },
    include: { locations: { where: { isPrimary: true }, take: 1 }, contacts: true, website: true },
  });
  if (!business) throw new BusinessNotFoundError();

  const location = business.locations[0];
  const phone = business.contacts.find((c) => c.type === "PHONE")?.value ?? null;
  const whatsapp = business.contacts.find((c) => c.type === "WHATSAPP")?.value ?? null;
  const email = business.contacts.find((c) => c.type === "EMAIL")?.value ?? null;
  const photos = (business.photosJson as unknown as BusinessPhotoRef[] | null) ?? null;

  const copyInput = {
    businessName: business.name,
    categoryPrimary: business.categoryPrimary,
    description: business.description,
    addressFormatted: location?.addressFormatted ?? null,
    city: location?.city ?? null,
    suburb: location?.suburb ?? null,
    phone,
    whatsapp,
    email,
    rating: business.rating,
    reviewCount: business.reviewCount,
    openingHours: (business.openingHoursJson as string[] | null) ?? null,
    latitude: location?.latitude ?? null,
    longitude: location?.longitude ?? null,
    googleMapsUrl: business.googleMapsUrl,
  };

  const images = buildBusinessImages({
    businessId: business.id,
    businessName: business.name,
    categoryPrimary: business.categoryPrimary,
    photos,
  });

  const plan = planWebsite({
    categoryPrimary: business.categoryPrimary,
    hasRating: Boolean(business.rating),
    hasImages: Boolean(photos?.length),
    hasLocation: Boolean(location?.latitude && location?.longitude),
    hasOpeningHours: Boolean(copyInput.openingHours?.length),
    hasContactChannel: Boolean(phone || whatsapp || email),
  });

  const resolvedStyle = style ?? defaultStyleForCategory(business.categoryPrimary);
  const theme = generateTheme(resolvedStyle);

  const { pages, factSources, unknownFacts } = await generateCopy(plan, copyInput, images);

  return {
    isWebsiteConcept: true,
    generatorVersion: 3,
    businessName: business.name,
    categoryPrimary: business.categoryPrimary,
    theme,
    navigation: plan.navigation,
    pages,
    assets: images,
    factSources,
    unknownFacts,
    generatedAt: new Date().toISOString(),
  };
}

export async function createWebsiteConcept(params: { userId: string; businessId: string; leadId?: string | null; style?: string }) {
  const business = await db.business.findUnique({ where: { id: params.businessId } });
  if (!business) throw new BusinessNotFoundError();

  const style = params.style && isWebsiteStyle(params.style) ? params.style : undefined;
  const concept = await buildConceptForBusiness(params.businessId, style);

  const demo = await db.demo.create({
    data: {
      userId: params.userId,
      businessId: params.businessId,
      leadId: params.leadId ?? undefined,
      title: `${business.name} — Website Concept`,
      previewToken: generatePreviewToken(),
      style: concept.theme.style,
      contentJson: concept as unknown as Prisma.InputJsonValue,
      version: concept.generatorVersion,
    },
  });

  if (params.leadId) {
    await db.activity.create({
      data: {
        userId: params.userId,
        leadId: params.leadId,
        businessId: params.businessId,
        type: "DEMO_GENERATED",
        message: `Website concept generated for ${business.name}.`,
      },
    });
  }

  return demo;
}

export async function regenerateWebsiteConcept(demoId: string, userId: string, style?: string) {
  const demo = await db.demo.findFirst({ where: { id: demoId, userId } });
  if (!demo) return null;

  const resolvedStyle = style && isWebsiteStyle(style) ? style : (demo.style as WebsiteStyle);
  const concept = await buildConceptForBusiness(demo.businessId, isWebsiteStyle(resolvedStyle) ? resolvedStyle : undefined);

  return db.demo.update({
    where: { id: demoId },
    data: { style: concept.theme.style, contentJson: concept as unknown as Prisma.InputJsonValue, version: concept.generatorVersion },
  });
}

export async function duplicateWebsiteConcept(demoId: string, userId: string) {
  const demo = await db.demo.findFirst({ where: { id: demoId, userId } });
  if (!demo) return null;

  return db.demo.create({
    data: {
      userId,
      businessId: demo.businessId,
      leadId: demo.leadId,
      title: `${demo.title} (Copy)`,
      previewToken: generatePreviewToken(),
      style: demo.style,
      contentJson: demo.contentJson as Prisma.InputJsonValue,
      version: demo.version,
    },
  });
}

export async function renameWebsiteConcept(demoId: string, userId: string, title: string) {
  const demo = await db.demo.findFirst({ where: { id: demoId, userId } });
  if (!demo) return null;
  return db.demo.update({ where: { id: demoId }, data: { title } });
}

export async function updateWebsiteConceptContent(demoId: string, userId: string, contentJson: WebsiteConcept) {
  const demo = await db.demo.findFirst({ where: { id: demoId, userId } });
  if (!demo) return null;
  return db.demo.update({ where: { id: demoId }, data: { contentJson: contentJson as unknown as Prisma.InputJsonValue } });
}
