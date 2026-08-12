import Link from "next/link";
import { PhoneCall, CalendarClock, Flame, FileText, Sparkles, ArrowRight } from "lucide-react";
import { auth } from "@/lib/auth";
import { getDashboardOverview } from "@/lib/services/dashboard-service";
import { getOrCreateUserSettings } from "@/lib/services/settings-service";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreBadge } from "@/components/shared/score-badge";
import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/utils";

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [overview, settings] = await Promise.all([getDashboardOverview(userId), getOrCreateUserSettings(userId)]);
  const firstName = session?.user.name?.split(" ")[0];

  return (
    <div className="flex h-full flex-col">
      <PageHeader
        title={firstName ? `Welcome back, ${firstName}` : "Dashboard"}
        description={`Here's what's happening in ${settings.productName} today.`}
        actions={
          <Button asChild>
            <Link href="/lead-finder">
              Find leads <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 p-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PhoneCall className="size-4 text-primary" /> Today&rsquo;s Calls
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {overview.todaysCalls.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing scheduled for today — build a queue in Call List.</p>
            ) : (
              <ul className="space-y-2.5">
                {overview.todaysCalls.map((lead) => (
                  <li key={lead.id}>
                    <Link href={`/business/${lead.businessId}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-accent">
                      <span className="text-sm font-medium">{lead.business.name}</span>
                      {lead.business.leadScores[0] && <ScoreBadge score={lead.business.leadScores[0].score} quality={lead.business.leadScores[0].quality} size="sm" />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="size-4 text-primary" /> Follow Ups
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {overview.followUps.length === 0 ? (
              <p className="text-sm text-muted-foreground">No upcoming follow-ups scheduled.</p>
            ) : (
              <ul className="space-y-2.5">
                {overview.followUps.map((f) => (
                  <li key={f.id}>
                    <Link href={`/business/${f.lead.businessId}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-accent">
                      <span className="text-sm font-medium">{f.lead.business.name}</span>
                      <span className="text-xs text-muted-foreground">{formatRelativeTime(f.dueAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Flame className="size-4 text-primary" /> Interested Leads
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {overview.interestedLeads.length === 0 ? (
              <p className="text-sm text-muted-foreground">No leads marked interested yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {overview.interestedLeads.map((lead) => (
                  <li key={lead.id}>
                    <Link href={`/business/${lead.businessId}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-accent">
                      <span className="text-sm font-medium">{lead.business.name}</span>
                      {lead.business.leadScores[0] && <ScoreBadge score={lead.business.leadScores[0].score} quality={lead.business.leadScores[0].quality} size="sm" />}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="size-4 text-primary" /> Proposals Due
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {overview.proposalsDue.length === 0 ? (
              <p className="text-sm text-muted-foreground">No open proposals right now.</p>
            ) : (
              <ul className="space-y-2.5">
                {overview.proposalsDue.map((p) => (
                  <li key={p.id}>
                    <Link href={`/business/${p.lead.businessId}`} className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 hover:bg-accent">
                      <span className="text-sm font-medium">{p.lead.business.name}</span>
                      <span className="text-xs text-muted-foreground capitalize">{p.status.toLowerCase()}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="size-4 text-primary" /> Recently Discovered Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {overview.recentlyDiscovered.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="No new discoveries this week"
                description="Run a search in Lead Finder to surface new businesses."
                action={
                  <Button asChild size="sm">
                    <Link href="/lead-finder">Go to Lead Finder</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {overview.recentlyDiscovered.map((b) => (
                  <Link key={b.id} href={`/business/${b.id}`} className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 hover:bg-accent">
                    <div>
                      <p className="text-sm font-medium">{b.name}</p>
                      <p className="text-xs capitalize text-muted-foreground">{b.categoryPrimary}</p>
                    </div>
                    {b.leadScores[0] && <ScoreBadge score={b.leadScores[0].score} quality={b.leadScores[0].quality} size="sm" />}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
