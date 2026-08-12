import { Badge } from "@/components/ui/badge";
import type { WebsiteStatus } from "@prisma/client";
import { Ban, Clock } from "lucide-react";

const STATUS_CONFIG: Record<WebsiteStatus, { label: string; variant: "destructive" | "warning" | "secondary" | "success" }> = {
  NONE: { label: "No website", variant: "destructive" },
  POOR: { label: "Poor website", variant: "destructive" },
  AVERAGE: { label: "Average website", variant: "warning" },
  GOOD: { label: "Good website", variant: "success" },
};

/**
 * `website` is null when the business has no known website at all.
 * `website.status` is null when a website exists but hasn't been audited yet.
 */
export function WebsiteStatusBadge({ website }: { website: { status: WebsiteStatus | null } | null | undefined }) {
  if (!website) {
    const config = STATUS_CONFIG.NONE;
    return (
      <Badge variant={config.variant}>
        <Ban className="size-3" />
        {config.label}
      </Badge>
    );
  }

  if (!website.status) {
    return (
      <Badge variant="secondary">
        <Clock className="size-3" />
        Not yet audited
      </Badge>
    );
  }

  const config = STATUS_CONFIG[website.status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
