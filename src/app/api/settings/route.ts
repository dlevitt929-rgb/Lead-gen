import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUserId, isResponse } from "@/lib/api-helpers";
import { db } from "@/lib/db";

const packageSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  priceOnce: z.number().min(0),
  priceRecurring: z.number().min(0).nullable(),
  description: z.string(),
});

const settingsSchema = z.object({
  productName: z.string().min(1).max(60).optional(),
  currency: z.string().min(3).max(3).optional(),
  defaultCountry: z.string().min(1).optional(),
  defaultRegion: z.string().nullable().optional(),
  defaultCity: z.string().nullable().optional(),
  packages: z.array(packageSchema).optional(),
});

export async function PATCH(req: Request) {
  const userId = await requireUserId();
  if (isResponse(userId)) return userId;

  const body = await req.json().catch(() => null);
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid settings." }, { status: 400 });

  const { packages, ...rest } = parsed.data;

  const updated = await db.userSettings.update({
    where: { userId },
    data: {
      ...rest,
      ...(packages ? { packagesJson: JSON.stringify(packages) } : {}),
    },
  });

  return NextResponse.json(updated);
}
