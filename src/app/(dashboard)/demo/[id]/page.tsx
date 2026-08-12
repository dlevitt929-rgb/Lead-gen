import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { DemoPreview } from "@/components/demos/demo-preview";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import type { DemoConcept } from "@/lib/services/demo-generator";

export default async function DemoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  const demo = await db.demo.findFirst({ where: { id, userId: session!.user.id }, include: { business: true } });
  if (!demo) notFound();

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={demo.title}
        description={`Generated ${formatDateTime(demo.createdAt)}`}
        actions={
          <Button variant="outline" asChild>
            <Link href={`/business/${demo.businessId}`}>
              <ArrowLeft className="size-4" /> Back to business
            </Link>
          </Button>
        }
      />
      <div className="mx-auto w-full max-w-4xl p-6">
        <DemoPreview concept={demo.contentJson as unknown as DemoConcept} businessName={demo.business.name} />
      </div>
    </div>
  );
}
