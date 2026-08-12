"use client";

import * as React from "react";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, CheckCircle2, XCircle, ExternalLink, ShieldOff, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PackageConfig } from "@/lib/services/settings-service";
import type { IntegrationInfo } from "@/lib/integrations";

interface DncLead {
  id: string;
  businessId: string;
  business: { name: string };
}

export function SettingsClient({
  initialSettings,
  integrations,
  dncLeads,
}: {
  initialSettings: { productName: string; currency: string; defaultCountry: string; defaultRegion: string | null; defaultCity: string | null; packages: PackageConfig[] };
  integrations: IntegrationInfo[];
  dncLeads: DncLead[];
}) {
  const [productName, setProductName] = React.useState(initialSettings.productName);
  const [currency, setCurrency] = React.useState(initialSettings.currency);
  const [defaultCountry, setDefaultCountry] = React.useState(initialSettings.defaultCountry);
  const [defaultRegion, setDefaultRegion] = React.useState(initialSettings.defaultRegion ?? "");
  const [defaultCity, setDefaultCity] = React.useState(initialSettings.defaultCity ?? "");
  const [packages, setPackages] = React.useState<PackageConfig[]>(initialSettings.packages);
  const [saving, setSaving] = React.useState(false);
  const [dnc, setDnc] = React.useState(dncLeads);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productName, currency, defaultCountry, defaultRegion: defaultRegion || null, defaultCity: defaultCity || null, packages }),
      });
      if (!res.ok) throw new Error();
      toast.success("Settings saved.");
    } catch {
      toast.error("Could not save settings.");
    } finally {
      setSaving(false);
    }
  }

  function updatePackage(id: string, patch: Partial<PackageConfig>) {
    setPackages((pkgs) => pkgs.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }

  function addPackage() {
    setPackages((pkgs) => [...pkgs, { id: `pkg_${Date.now()}`, name: "New Package", priceOnce: 5000, priceRecurring: null, description: "" }]);
  }

  function removePackage(id: string) {
    setPackages((pkgs) => pkgs.filter((p) => p.id !== id));
  }

  async function restoreLead(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "NEW" }),
    });
    if (res.ok) {
      setDnc((d) => d.filter((l) => l.id !== leadId));
      toast.success("Removed from Do Not Contact.");
    } else {
      toast.error("Could not update this lead.");
    }
  }

  async function deleteLead(leadId: string) {
    const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    if (res.ok) {
      setDnc((d) => d.filter((l) => l.id !== leadId));
      toast.success("Lead data deleted.");
    } else {
      toast.error("Could not delete this lead.");
    }
  }

  return (
    <div className="max-w-3xl space-y-6 p-6">
      <Card id="profile">
        <CardHeader>
          <CardTitle>Product</CardTitle>
          <CardDescription>Rename the product across your workspace.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 pb-5 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Product name</Label>
            <Input value={productName} onChange={(e) => setProductName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Currency (ISO code)</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} />
          </div>
          <div className="space-y-1.5">
            <Label>Default country</Label>
            <Input value={defaultCountry} onChange={(e) => setDefaultCountry(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Default province / state</Label>
            <Input value={defaultRegion} onChange={(e) => setDefaultRegion(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Default city</Label>
            <Input value={defaultCity} onChange={(e) => setDefaultCity(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Package pricing</CardTitle>
          <CardDescription>Used to estimate lead value. These are your own figures — always shown as estimates.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-5">
          {packages.map((pkg) => (
            <div key={pkg.id} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <Input value={pkg.name} onChange={(e) => updatePackage(pkg.id, { name: e.target.value })} className="flex-1" />
                <Button variant="ghost" size="icon" onClick={() => removePackage(pkg.id)}>
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Once-off price</Label>
                  <Input type="number" value={pkg.priceOnce} onChange={(e) => updatePackage(pkg.id, { priceOnce: Number(e.target.value) })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Monthly recurring</Label>
                  <Input
                    type="number"
                    value={pkg.priceRecurring ?? ""}
                    onChange={(e) => updatePackage(pkg.id, { priceRecurring: e.target.value ? Number(e.target.value) : null })}
                  />
                </div>
              </div>
              <Textarea value={pkg.description} onChange={(e) => updatePackage(pkg.id, { description: e.target.value })} rows={2} placeholder="What's included…" />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addPackage}>
            <Plus className="size-3.5" /> Add package
          </Button>
        </CardContent>
      </Card>

      <Button onClick={handleSave} disabled={saving} size="lg">
        {saving ? <Loader2 className="animate-spin" /> : <Save />}
        Save settings
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>Integrations</CardTitle>
          <CardDescription>Configured via environment variables — never entered or stored in the app itself.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-5">
          {integrations.map((integration) => (
            <div key={integration.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{integration.name}</p>
                  {integration.configured ? (
                    <Badge variant="success">
                      <CheckCircle2 className="size-3" /> Configured
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <XCircle className="size-3" /> Not configured
                    </Badge>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{integration.description}</p>
                {!integration.configured && integration.envVar !== "(none required)" && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Set <code className="rounded bg-muted px-1 py-0.5">{integration.envVar}</code> in your environment.{" "}
                    <a href={integration.setupUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-primary hover:underline">
                      Get a key <ExternalLink className="size-3" />
                    </a>
                  </p>
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldOff className="size-4" /> Do Not Contact
          </CardTitle>
          <CardDescription>Businesses you&rsquo;ve marked as do-not-contact. Restore or permanently delete their data.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pb-5">
          {dnc.length === 0 ? (
            <p className="text-sm text-muted-foreground">No businesses on your Do Not Contact list.</p>
          ) : (
            dnc.map((lead) => (
              <div key={lead.id} className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm">
                <span>{lead.business.name}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => restoreLead(lead.id)}>
                    Restore
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => deleteLead(lead.id)}>
                    Delete data
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
