import { Target, PhoneCall, MessagesSquare, Flame, Sparkles, FileText, Trophy, XCircle, TrendingUp, Wallet } from "lucide-react";
import { auth } from "@/lib/auth";
import { getAnalytics } from "@/lib/services/analytics-service";
import { getOrCreateUserSettings } from "@/lib/services/settings-service";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/analytics/stat-card";
import { FunnelChart } from "@/components/analytics/funnel-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

export default async function AnalyticsPage() {
  const session = await auth();
  const userId = session!.user.id;
  const [analytics, settings] = await Promise.all([getAnalytics(userId), getOrCreateUserSettings(userId)]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Analytics" description="Your real sales performance — computed from your actual pipeline activity." />
      <div className="space-y-5 p-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatCard label="Leads found" value={analytics.leadsFound} icon={Target} />
          <StatCard label="Calls made" value={analytics.callsMade} icon={PhoneCall} />
          <StatCard label="Calls answered" value={analytics.callsAnswered} icon={MessagesSquare} />
          <StatCard label="Interested" value={analytics.interested} icon={Flame} />
          <StatCard label="Demos created" value={analytics.demosCreated} icon={Sparkles} />
          <StatCard label="Proposals sent" value={analytics.proposalsSent} icon={FileText} />
          <StatCard label="Deals won" value={analytics.dealsWon} icon={Trophy} />
          <StatCard label="Deals lost" value={analytics.dealsLost} icon={XCircle} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <FunnelChart stages={analytics.funnel} />

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <StatCard
                label="Estimated revenue"
                value={formatCurrency(analytics.revenue, settings.currency)}
                icon={Wallet}
                hint="Sum of won leads' estimated value"
              />
              <StatCard
                label="Conversion rate"
                value={`${analytics.conversionRate.toFixed(1)}%`}
                icon={TrendingUp}
                hint="Leads → won deals"
              />
            </div>
            <Card>
              <CardHeader>
                <CardTitle>Best performers</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pb-5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Best-performing industry</span>
                  <span className={`font-medium ${analytics.bestIndustry ? "capitalize" : ""}`}>{analytics.bestIndustry ?? "Not enough data yet"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Best-performing area</span>
                  <span className="font-medium">{analytics.bestArea ?? "Not enough data yet"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Average project value</span>
                  <span className="font-medium">{formatCurrency(analytics.avgProjectValue, settings.currency)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
