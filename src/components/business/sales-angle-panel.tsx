import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2, MessageCircleQuestion, PhoneCall, Wrench, Package, ShieldQuestion } from "lucide-react";
import type { SalesAngle } from "@/lib/services/ai-sales-assistant";

export function SalesAnglePanel({
  angle,
  source,
  loading,
  onGenerate,
}: {
  angle: SalesAngle | null;
  source: "ai" | "fallback" | null;
  loading: boolean;
  onGenerate: () => void;
}) {
  if (!angle) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Sparkles className="size-8 text-muted-foreground" />
          <p className="font-medium">No sales angle generated yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Generate a personalized cold-call opener, talking points and objection handling based on this business&rsquo;s real data.
          </p>
          <Button onClick={onGenerate} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : <Sparkles />}
            {loading ? "Generating…" : "Generate sales angle"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Badge variant={source === "ai" ? "default" : "secondary"}>
          {source === "ai" ? "AI-generated" : "Rule-based (no AI provider configured)"}
        </Badge>
        <Button variant="outline" size="sm" onClick={onGenerate} disabled={loading}>
          {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
          Regenerate
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-1.5 py-4">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <PhoneCall className="size-4 text-primary" /> Cold-call opener
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">{angle.coldCallOpener}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1.5 py-4">
          <p className="text-sm font-medium">Why they might need a new website</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{angle.whyTheyNeedAWebsite}</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-medium">Biggest website problems</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {angle.biggestProblems.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 py-4">
            <p className="text-sm font-medium">Strengths to compliment</p>
            <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
              {angle.strengthsToCompliment.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="space-y-1.5 py-4">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <MessageCircleQuestion className="size-4 text-primary" /> Questions to ask
          </p>
          <ul className="list-disc space-y-1 pl-4 text-sm text-muted-foreground">
            {angle.questionsToAsk.map((q, i) => (
              <li key={i}>{q}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-1.5 py-4">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <Wrench className="size-4 text-primary" /> Website features to pitch
          </p>
          <div className="flex flex-wrap gap-1.5">
            {angle.featuresToPitch.map((f, i) => (
              <Badge key={i} variant="outline">
                {f}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex items-center gap-2 py-4 text-sm">
          <Package className="size-4 text-primary" />
          <span className="font-medium">Suggested package:</span> {angle.suggestedPackage}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 py-4">
          <p className="flex items-center gap-1.5 text-sm font-medium">
            <ShieldQuestion className="size-4 text-primary" /> Possible objections
          </p>
          {angle.objections.map((o, i) => (
            <div key={i} className="space-y-1">
              {i > 0 && <Separator className="mb-3" />}
              <p className="text-sm font-medium">&ldquo;{o.objection}&rdquo;</p>
              <p className="text-sm text-muted-foreground">{o.response}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
