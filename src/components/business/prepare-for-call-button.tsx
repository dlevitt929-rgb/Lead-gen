"use client";

import * as React from "react";
import { toast } from "sonner";
import { PhoneCall, Loader2, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { PrepareForCallStep } from "@/lib/services/call-queue-service";

const STATUS_ICON = {
  done: <CheckCircle2 className="size-4 text-success" />,
  skipped: <MinusCircle className="size-4 text-muted-foreground" />,
  failed: <XCircle className="size-4 text-destructive" />,
};

export function PrepareForCallButton({ businessId, onDone }: { businessId: string; onDone: () => void }) {
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [steps, setSteps] = React.useState<PrepareForCallStep[]>([]);

  async function handlePrepare() {
    setLoading(true);
    setSteps([]);
    try {
      const res = await fetch(`/api/businesses/${businessId}/prepare-for-call`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSteps(data.steps);
      setOpen(true);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not prepare this lead for a call.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button variant="secondary" onClick={handlePrepare} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <PhoneCall />}
        Prepare for Call
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Prepared for call</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                {STATUS_ICON[s.status]}
                <div>
                  <p className="font-medium">{s.step}</p>
                  <p className="text-xs text-muted-foreground">{s.message}</p>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
