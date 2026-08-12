import Link from "next/link";
import { Building2, Star, MapPin, Search } from "lucide-react";
import { auth } from "@/lib/auth";
import { listDiscoveredBusinesses } from "@/lib/services/business-service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ScoreBadge } from "@/components/shared/score-badge";
import { WebsiteStatusBadge } from "@/components/shared/website-status-badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  const { q } = await searchParams;
  const businesses = await listDiscoveredBusinesses(session!.user.id, q);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Business Details" description="Every business LeadForge has discovered for you, ready to research and pitch." />
      <div className="space-y-5 p-6">
        <form className="flex max-w-md items-center gap-2">
          <Input name="q" placeholder="Search by name or category…" defaultValue={q} />
          <Button type="submit" size="icon" variant="secondary">
            <Search className="size-4" />
          </Button>
        </form>

        {businesses.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No businesses discovered yet"
            description="Run a search in Lead Finder to start building your list of real local businesses."
            action={
              <Button asChild>
                <Link href="/lead-finder">Go to Lead Finder</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {businesses.map((b) => {
              const score = b.leadScores[0];
              const location = b.locations[0];
              return (
                <Link key={b.id} href={`/business/${b.id}`}>
                  <Card className="h-full p-4 transition-colors hover:border-primary/40">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium leading-tight">{b.name}</p>
                        <p className="text-xs capitalize text-muted-foreground">{b.categoryPrimary}</p>
                      </div>
                      {score && <ScoreBadge score={score.score} quality={score.quality} size="sm" />}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3" />
                          {[location.suburb, location.city].filter(Boolean).join(", ") || "—"}
                        </span>
                      )}
                      {b.rating && (
                        <span className="flex items-center gap-1">
                          <Star className="size-3 fill-warning text-warning" />
                          {b.rating.toFixed(1)} ({b.reviewCount})
                        </span>
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <WebsiteStatusBadge website={b.website} absenceStatus={b.websiteAbsenceStatus} />
                      {b.leads.length > 0 && <span className="text-xs font-medium text-primary">Saved lead</span>}
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
