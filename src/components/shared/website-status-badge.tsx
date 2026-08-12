import { Badge } from "@/components/ui/badge";
import type { WebsiteStatus, WebsiteAbsenceStatus } from "@prisma/client";
import { Ban, Clock, HelpCircle } from "lucide-react";

const STATUS_CONFIG: Record<WebsiteStatus, { label: string; variant: "destructive" | "warning" | "secondary" | "success" }> = {
  NONE: { label: "No website", variant: "destructive" },
  POOR: { label: "Poor website", variant: "destructive" },
  AVERAGE: { label: "Average website", variant: "warning" },
  GOOD: { label: "Good website", variant: "success" },
};

/**
 * `website` is null when no website URL is currently known for this
 * business. That is NOT the same as "confirmed no website" — most of the
 * time it just means it hasn't been verified yet (see
 * website-discovery-service). `absenceStatus` distinguishes the two:
 * CONFIRMED_NONE (a source like Google Places actively checked and found
 * none) vs UNKNOWN (nobody's confirmed either way).
 */
export function WebsiteStatusBadge({
  website,
  absenceStatus = "UNKNOWN",
}: {
  website: { status: WebsiteStatus | null } | null | undefined;
  absenceStatus?: WebsiteAbsenceStatus;
}) {
  if (!website) {
    if (absenceStatus === "CONFIRMED_NONE") {
      return (
        <Badge variant="destructive">
          <Ban className="size-3" />
          No verified website
        </Badge>
      );
    }
    return (
      <Badge variant="secondary">
        <HelpCircle className="size-3" />
        Website unknown
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
