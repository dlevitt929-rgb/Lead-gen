export interface IntegrationInfo {
  id: string;
  name: string;
  envVar: string;
  configured: boolean;
  required: boolean;
  description: string;
  setupUrl: string;
}

export function getIntegrationStatuses(): IntegrationInfo[] {
  return [
    {
      id: "google_places",
      name: "Google Places API",
      envVar: "GOOGLE_PLACES_API_KEY",
      configured: Boolean(process.env.GOOGLE_PLACES_API_KEY?.trim()),
      required: false,
      description: "Richer, more complete business search results (ratings, hours, verified phone numbers).",
      setupUrl: "https://developers.google.com/maps/documentation/places/web-service/get-api-key",
    },
    {
      id: "google_pagespeed",
      name: "Google PageSpeed Insights",
      envVar: "GOOGLE_PAGESPEED_API_KEY",
      configured: Boolean(process.env.GOOGLE_PAGESPEED_API_KEY?.trim()),
      required: false,
      description: "Real Lighthouse performance, accessibility and SEO scores for website audits.",
      setupUrl: "https://developers.google.com/speed/docs/insights/v5/get-started",
    },
    {
      id: "openstreetmap",
      name: "OpenStreetMap",
      envVar: "(none required)",
      configured: true,
      required: false,
      description: "Free business search and map tiles — works out of the box, no API key needed.",
      setupUrl: "https://www.openstreetmap.org/",
    },
    {
      id: "anthropic",
      name: "Anthropic Claude",
      envVar: "ANTHROPIC_API_KEY",
      configured: Boolean(process.env.ANTHROPIC_API_KEY?.trim()),
      required: false,
      description: "AI-generated sales angles, cold-call scripts and objection handling.",
      setupUrl: "https://console.anthropic.com/settings/keys",
    },
    {
      id: "openai",
      name: "OpenAI",
      envVar: "OPENAI_API_KEY",
      configured: Boolean(process.env.OPENAI_API_KEY?.trim()),
      required: false,
      description: "Alternative AI provider for sales angles if Anthropic isn't configured.",
      setupUrl: "https://platform.openai.com/api-keys",
    },
  ];
}
