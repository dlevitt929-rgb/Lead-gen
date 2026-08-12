"use client";

import * as React from "react";
import { Phone, MessageCircle, MapPin, Star, Clock, ImageOff } from "lucide-react";
import type { WebsiteConcept, WebsitePage, WebsiteSection, WebsiteAsset } from "@/lib/services/website-concept-types";
import { cn } from "@/lib/utils";

const RADIUS_CLASS: Record<string, string> = { none: "rounded-none", sm: "rounded-sm", md: "rounded-lg", lg: "rounded-2xl", full: "rounded-3xl" };

function findAsset(assets: WebsiteAsset[], id: string | null | undefined) {
  return assets.find((a) => a.id === id) ?? null;
}

function AssetImage({ asset, className }: { asset: WebsiteAsset | null; className?: string }) {
  if (!asset) {
    return (
      <div className={cn("flex items-center justify-center bg-muted text-muted-foreground", className)}>
        <ImageOff className="size-8" />
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- external/data-URI sourced images, not part of Next's static asset pipeline */}
      <img src={asset.url} alt={asset.altText} className="h-full w-full object-cover" />
      <span className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{asset.provenanceLabel}</span>
    </div>
  );
}

function Section({ section, concept, radiusClass }: { section: WebsiteSection; concept: WebsiteConcept; radiusClass: string }) {
  const { theme, assets } = concept;
  const d = section.data as Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

  switch (section.type) {
    case "hero":
      return (
        <div className="px-8 py-16 text-center" style={{ background: `linear-gradient(135deg, ${theme.primaryColor}, ${theme.secondaryColor})`, color: "#fff" }}>
          <h1 className="text-3xl font-bold sm:text-4xl" style={{ fontFamily: theme.fontHeading }}>
            {d.headline}
          </h1>
          <p className="mx-auto mt-3 max-w-xl opacity-90">{d.subheadline}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            {d.primaryCta && (
              <a href={d.primaryCta.href} className={cn("px-5 py-2.5 text-sm font-semibold shadow", radiusClass)} style={{ background: "#fff", color: theme.primaryColor }}>
                {d.primaryCta.label}
              </a>
            )}
            {d.secondaryCta && (
              <a href={d.secondaryCta.href} target="_blank" rel="noreferrer" className={cn("border border-white/50 px-5 py-2.5 text-sm font-semibold", radiusClass)}>
                {d.secondaryCta.label}
              </a>
            )}
          </div>
        </div>
      );

    case "services":
      return (
        <div className="px-8 py-10">
          <h2 className="mb-5 text-center text-xl font-semibold" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>
            {d.heading}
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(d.items as { title: string; description: string }[]).map((s, i) => (
              <div key={i} className={cn("border p-4", radiusClass)}>
                <p className="font-medium" style={{ color: theme.textColor }}>{s.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "about":
      return (
        <div className="px-8 py-10">
          <h2 className="mb-3 text-xl font-semibold" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>
            {d.heading}
          </h2>
          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{d.body}</p>
          {!d.hasRealDescription && (
            <p className="mt-2 max-w-2xl text-xs italic text-muted-foreground">
              No public business description was available — replace this with the business&rsquo;s own words before sending.
            </p>
          )}
        </div>
      );

    case "reviews":
      return (
        <div className="px-8 py-10 text-center">
          <h2 className="mb-3 text-xl font-semibold" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>
            {d.heading}
          </h2>
          <div className="flex items-center justify-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} className={cn("size-5", d.rating && i < Math.round(d.rating) ? "fill-warning text-warning" : "text-muted-foreground/30")} />
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{d.summary}</p>
        </div>
      );

    case "stats":
      return (
        <div className="grid grid-cols-2 gap-4 px-8 py-8 sm:grid-cols-4">
          {(d.items as { label: string; value: string }[]).map((s, i) => (
            <div key={i} className="text-center">
              <p className="text-2xl font-bold" style={{ color: theme.secondaryColor }}>{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      );

    case "gallery":
      return (
        <div className="px-8 py-10">
          <h2 className="mb-5 text-center text-xl font-semibold" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>
            {d.heading}
          </h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(d.imageIds as string[]).map((id) => (
              <AssetImage key={id} asset={findAsset(assets, id)} className={cn("aspect-square", radiusClass)} />
            ))}
          </div>
        </div>
      );

    case "contact":
      return (
        <div className="px-8 py-10">
          <h2 className="mb-5 text-center text-xl font-semibold" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>
            {d.heading}
          </h2>
          <div className="mx-auto flex max-w-md flex-col gap-3 text-sm">
            {d.address && (
              <div className="flex items-center gap-2">
                <MapPin className="size-4" style={{ color: theme.secondaryColor }} /> {d.address}
              </div>
            )}
            {d.phone && (
              <div className="flex items-center gap-2">
                <Phone className="size-4" style={{ color: theme.secondaryColor }} /> {d.phone}
              </div>
            )}
            {d.whatsapp && (
              <div className="flex items-center gap-2">
                <MessageCircle className="size-4" style={{ color: theme.secondaryColor }} /> WhatsApp available
              </div>
            )}
            {d.email && <div>{d.email}</div>}
            {!d.address && !d.phone && !d.whatsapp && !d.email && <p className="text-center text-muted-foreground">No verified contact details yet.</p>}
          </div>
        </div>
      );

    case "cta":
      return (
        <div className="px-8 py-12 text-center" style={{ backgroundColor: theme.secondaryColor, color: "#fff" }}>
          <h2 className="text-xl font-semibold" style={{ fontFamily: theme.fontHeading }}>{d.heading}</h2>
          <p className="mt-1 opacity-90">{d.body}</p>
          {d.primaryCta && (
            <a href={d.primaryCta.href} className={cn("mt-4 inline-block px-5 py-2.5 text-sm font-semibold shadow", radiusClass)} style={{ background: "#fff", color: theme.secondaryColor }}>
              {d.primaryCta.label}
            </a>
          )}
        </div>
      );

    case "map":
      return (
        <div className="px-8 py-10 text-center">
          {d.latitude && d.longitude ? (
            <div className={cn("mx-auto flex h-56 max-w-xl items-center justify-center border bg-muted text-sm text-muted-foreground", radiusClass)}>
              Map centered at {d.latitude.toFixed(4)}, {d.longitude.toFixed(4)}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No verified coordinates available for a map yet.</p>
          )}
          {d.address && <p className="mt-2 text-sm text-muted-foreground">{d.address}</p>}
        </div>
      );

    case "hours":
      return (
        <div className="px-8 py-10">
          <h2 className="mb-3 flex items-center justify-center gap-2 text-xl font-semibold" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>
            <Clock className="size-5" /> {d.heading}
          </h2>
          <div className="mx-auto max-w-xs text-center text-sm text-muted-foreground">
            {(d.hours as string[]).length > 0 ? (d.hours as string[]).map((h: string, i: number) => <p key={i}>{h}</p>) : <p>Hours not yet confirmed.</p>}
          </div>
        </div>
      );

    case "faq":
      return (
        <div className="px-8 py-10">
          <h2 className="mb-5 text-center text-xl font-semibold" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>
            {d.heading}
          </h2>
          <div className="mx-auto max-w-xl space-y-3">
            {(d.items as { question: string; answer: string }[]).length > 0 ? (
              (d.items as { question: string; answer: string }[]).map((f, i) => (
                <div key={i} className={cn("border p-3", radiusClass)}>
                  <p className="text-sm font-medium">{f.question}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{f.answer}</p>
                </div>
              ))
            ) : (
              <p className="text-center text-sm text-muted-foreground">No FAQ answers could be grounded in confirmed data yet.</p>
            )}
          </div>
        </div>
      );

    case "booking":
    case "quote_form":
      return (
        <div className="px-8 py-10 text-center">
          <h2 className="mb-2 text-xl font-semibold" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>
            {d.heading}
          </h2>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{d.body}</p>
          {section.type === "quote_form" && d.fields && (
            <div className="mx-auto mt-4 flex max-w-xs flex-col gap-2">
              {(d.fields as string[]).map((f: string, i: number) => (
                <div key={i} className={cn("border bg-muted/40 px-3 py-2 text-left text-xs text-muted-foreground", radiusClass)}>
                  {f}
                </div>
              ))}
            </div>
          )}
          {d.cta && (
            <a href={d.cta.href} className={cn("mt-4 inline-block px-5 py-2.5 text-sm font-semibold text-white shadow", radiusClass)} style={{ backgroundColor: theme.primaryColor }}>
              {d.cta.label}
            </a>
          )}
        </div>
      );

    case "team":
      return (
        <div className="px-8 py-10 text-center">
          <h2 className="mb-2 text-xl font-semibold" style={{ fontFamily: theme.fontHeading, color: theme.textColor }}>{d.heading}</h2>
          <p className="text-sm text-muted-foreground">No verified team information available yet — add real staff details before publishing.</p>
        </div>
      );

    default:
      return null;
  }
}

export const VIEWPORT_WIDTH: Record<"desktop" | "tablet" | "mobile", string> = {
  desktop: "w-full",
  tablet: "w-[768px] max-w-full",
  mobile: "w-[390px] max-w-full",
};

export function WebsiteRenderer({ concept, page, viewport = "desktop" }: { concept: WebsiteConcept; page: WebsitePage; viewport?: "desktop" | "tablet" | "mobile" }) {
  const radiusClass = RADIUS_CLASS[concept.theme.radius] ?? "rounded-lg";
  return (
    <div className={cn("mx-auto overflow-hidden border shadow-sm transition-all", radiusClass, VIEWPORT_WIDTH[viewport])} style={{ backgroundColor: concept.theme.backgroundColor, fontFamily: concept.theme.fontBody }}>
      <nav className="flex items-center justify-between border-b px-6 py-3 text-sm font-medium" style={{ color: concept.theme.textColor }}>
        <span style={{ fontFamily: concept.theme.fontHeading }}>{concept.businessName}</span>
        <div className="hidden gap-4 sm:flex">
          {concept.navigation.map((n) => (
            <span key={n.pageId} className={n.pageId === page.id ? "font-semibold" : "opacity-60"} style={{ color: n.pageId === page.id ? concept.theme.secondaryColor : undefined }}>
              {n.label}
            </span>
          ))}
        </div>
      </nav>
      {page.sections.map((s) => (
        <div key={s.id} className="border-b last:border-0" style={{ borderColor: "color-mix(in srgb, currentColor 10%, transparent)" }}>
          <Section section={s} concept={concept} radiusClass={radiusClass} />
        </div>
      ))}
    </div>
  );
}
