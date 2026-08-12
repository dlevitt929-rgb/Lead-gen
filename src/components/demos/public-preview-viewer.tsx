"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { WebsiteRenderer } from "@/components/demos/website-renderer";
import type { WebsiteConcept } from "@/lib/services/website-concept-types";

export function PublicPreviewViewer({ concept }: { concept: WebsiteConcept }) {
  const [activePageId, setActivePageId] = React.useState(concept.pages[0]?.id ?? "home");
  const activePage = concept.pages.find((p) => p.id === activePageId) ?? concept.pages[0];
  if (!activePage) return null;

  return (
    <div className="space-y-3">
      {concept.pages.length > 1 && (
        <div className="flex flex-wrap justify-center gap-1">
          {concept.pages.map((p) => (
            <Button key={p.id} size="sm" variant={p.id === activePageId ? "default" : "ghost"} onClick={() => setActivePageId(p.id)}>
              {p.title}
            </Button>
          ))}
        </div>
      )}
      <WebsiteRenderer concept={concept} page={activePage} viewport="desktop" />
    </div>
  );
}
