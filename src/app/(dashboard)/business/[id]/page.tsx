import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { getBusinessDetail } from "@/lib/services/business-service";
import { BusinessDetailClient } from "@/components/business/business-detail-client";

export default async function BusinessDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const business = await getBusinessDetail(id, session!.user.id);
  if (!business) notFound();

  return <BusinessDetailClient business={business} repName={session!.user.name} />;
}
