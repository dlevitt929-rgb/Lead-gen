import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateUserSettings, getPackages } from "@/lib/services/settings-service";
import { getIntegrationStatuses } from "@/lib/integrations";
import { PageHeader } from "@/components/shared/page-header";
import { SettingsClient } from "@/components/settings/settings-client";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session!.user.id;

  const [settings, dncLeads] = await Promise.all([
    getOrCreateUserSettings(userId),
    db.lead.findMany({ where: { userId, doNotContact: true }, include: { business: { select: { name: true } } } }),
  ]);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title="Settings" description="Product, pricing, integrations and data controls." />
      <SettingsClient
        initialSettings={{
          productName: settings.productName,
          currency: settings.currency,
          defaultCountry: settings.defaultCountry,
          defaultRegion: settings.defaultRegion,
          defaultCity: settings.defaultCity,
          packages: getPackages(settings),
        }}
        integrations={getIntegrationStatuses()}
        dncLeads={dncLeads.map((l) => ({ id: l.id, businessId: l.businessId, business: l.business }))}
      />
    </div>
  );
}
