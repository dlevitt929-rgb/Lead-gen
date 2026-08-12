import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { DemoDetailClient } from "@/components/demos/demo-detail-client";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { WebsiteConcept } from "@/lib/services/website-concept-types";
import type { CurrentSiteInfo } from "@/components/demos/demo-viewer";

export default async function DemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const demo = await db.demo.findFirst({
    where: { id, userId: session!.user.id },
    include: { business: { include: { website: { include: { audits: { orderBy: { performedAt: "desc" }, take: 1 } } } } } },
  });
  if (!demo) notFound();

  const audit = demo.business.website?.audits[0];
  const currentSite: CurrentSiteInfo = {
    url: demo.business.website?.url ?? null,
    audit: audit
      ? {
          performedAt: audit.performedAt.toISOString(),
          performanceScore: audit.performanceScore,
          mobileScore: audit.mobileScore,
          seoScore: audit.seoScore,
          designScore: audit.designScore,
          conversionScore: audit.conversionScore,
          issues: (audit.issuesJson as unknown as { category: string; severity: string; message: string }[]) ?? [],
        }
      : null,
  };

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title="Website Concept"
        description={`Generated ${formatDateTime(demo.createdAt)}`}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/business/${demo.businessId}`}>
              <ArrowLeft className="size-4" /> Back to business
            </Link>
          </Button>
        }
      />
      <div className="mx-auto w-full max-w-5xl p-6">
        <DemoDetailClient
          demoId={demo.id}
          title={demo.title}
          previewToken={demo.previewToken}
          style={demo.style}
          concept={demo.contentJson as unknown as WebsiteConcept}
          currentSite={currentSite}
        />
      </div>
    </div>
  );
}
