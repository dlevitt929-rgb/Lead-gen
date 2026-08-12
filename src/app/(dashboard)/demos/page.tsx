import Link from "next/link";
import { Sparkles } from "lucide-react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { WEBSITE_STYLE_LABEL, type WebsiteStyle } from "@/lib/services/website-concept-types";

export default async function DemosPage() {
  const session = await auth();
  const demos = await db.demo.findMany({
    where: { userId: session!.user.id },
    include: { business: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Website Concepts" description="Fully automatic website concepts you've generated to pitch real businesses." />
      <div className="p-6">
        {demos.length === 0 ? (
          <EmptyState
            icon={Sparkles}
            title="No website concepts yet"
            description="Open any business's Sales Angle tab and click 'Generate Website Concept' to create a personalized, multi-page preview you can show them."
            action={
              <Button asChild>
                <Link href="/businesses">Browse businesses</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {demos.map((demo) => (
              <Link key={demo.id} href={`/demo/${demo.id}`}>
                <Card className="h-full p-4 transition-colors hover:border-primary/40">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{demo.business.name}</p>
                    <Badge variant="outline">{WEBSITE_STYLE_LABEL[demo.style as WebsiteStyle] ?? demo.style}</Badge>
                  </div>
                  <p className="text-xs capitalize text-muted-foreground">{demo.business.categoryPrimary}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{demo.title}</p>
                  <p className="mt-3 text-xs text-muted-foreground">{formatDateTime(demo.createdAt)}</p>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
