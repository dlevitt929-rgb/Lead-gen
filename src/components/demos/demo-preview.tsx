import { Phone, MessageCircle, MapPin, Star, Clock, AlertTriangle } from "lucide-react";
import type { DemoConcept } from "@/lib/services/demo-generator";

export function DemoPreview({ concept, businessName }: { concept: DemoConcept; businessName: string }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
        <p>
          <strong>Demo concept only.</strong> This is a mockup generated from {businessName}&rsquo;s public information to show them what&rsquo;s
          possible — it is not published anywhere and does not represent their real website.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border shadow-sm">
        {/* Hero */}
        <div className="bg-gradient-to-br from-primary to-primary/70 px-8 py-16 text-center text-primary-foreground">
          <h1 className="text-3xl font-bold sm:text-4xl">{concept.hero.headline}</h1>
          <p className="mx-auto mt-3 max-w-xl text-primary-foreground/90">{concept.hero.subheadline}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <span className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-primary shadow">{concept.hero.primaryCta}</span>
            <span className="rounded-lg border border-white/40 px-5 py-2.5 text-sm font-semibold">{concept.hero.secondaryCta}</span>
          </div>
        </div>

        {/* Services */}
        <div className="border-b bg-card px-8 py-10">
          <h2 className="mb-5 text-center text-xl font-semibold">Our Services</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {concept.services.map((s, i) => (
              <div key={i} className="rounded-lg border p-4">
                <p className="font-medium">{s.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* About */}
        <div className="border-b bg-muted/30 px-8 py-10">
          <h2 className="mb-3 text-xl font-semibold">About Us</h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{concept.about}</p>
        </div>

        {/* Reviews */}
        <div className="border-b bg-card px-8 py-10 text-center">
          <h2 className="mb-3 text-xl font-semibold">What Customers Say</h2>
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={`size-5 ${concept.reviews.rating && i < Math.round(concept.reviews.rating) ? "fill-warning text-warning" : "text-muted-foreground/30"}`} />
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{concept.reviews.summary}</p>
        </div>

        {/* Contact */}
        <div className="bg-muted/30 px-8 py-10">
          <h2 className="mb-5 text-center text-xl font-semibold">Get In Touch</h2>
          <div className="mx-auto flex max-w-md flex-col gap-3 text-sm">
            {concept.contact.address && (
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" /> {concept.contact.address}
              </div>
            )}
            {concept.contact.phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4 text-primary" /> {concept.contact.phone}
              </div>
            )}
            {concept.contact.whatsapp && (
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4 text-primary" /> WhatsApp available
              </div>
            )}
            {concept.contact.hours && concept.contact.hours.length > 0 && (
              <div className="flex items-start gap-2">
                <Clock className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  {concept.contact.hours.map((h, i) => (
                    <p key={i}>{h}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <p className="mb-2 text-sm font-medium">Recommended features for this business</p>
        <div className="flex flex-wrap gap-2">
          {concept.recommendedFeatures.map((f, i) => (
            <span key={i} className="rounded-full bg-accent px-3 py-1 text-xs text-accent-foreground">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
