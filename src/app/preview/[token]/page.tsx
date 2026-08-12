import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";
import { PublicPreviewViewer } from "@/components/demos/public-preview-viewer";
import type { WebsiteConcept } from "@/lib/services/website-concept-types";

export const metadata: Metadata = {
  title: "Website Concept Preview",
  robots: { index: false, follow: false, nocache: true },
};

// Public, unauthenticated by design — this is a private shareable link
// gated only by an unguessable token (see website-concept-service.ts), not a
// login. It must never claim to be the business's real, live website.
export default async function PublicPreviewPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const demo = await db.demo.findUnique({ where: { previewToken: token }, include: { business: true } });
  if (!demo) notFound();

  const concept = demo.contentJson as unknown as WebsiteConcept;
  if (!concept.pages?.length) notFound();

  return (
    <div className="min-h-screen bg-muted/30 p-6">
      <div className="mx-auto max-w-4xl space-y-4">
        <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
          <p>
            <strong>Concept preview only.</strong> This is a website mockup prepared for {demo.business.name} to review — it is not published anywhere and is
            not {demo.business.name}&rsquo;s real website.
          </p>
        </div>
        <PublicPreviewViewer concept={concept} />
      </div>
    </div>
  );
}
