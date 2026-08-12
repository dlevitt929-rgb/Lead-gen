import { anthropicProvider } from "./anthropic";
import { openaiProvider } from "./openai";
import { AINotConfiguredError } from "./types";
import type { AIProvider } from "./types";

const PROVIDERS: AIProvider[] = [anthropicProvider, openaiProvider];

export function getAIProvider(): AIProvider | null {
  return PROVIDERS.find((p) => p.isConfigured()) ?? null;
}

export function isAIConfigured(): boolean {
  return PROVIDERS.some((p) => p.isConfigured());
}

/**
 * Calls the active AI provider and parses a JSON object from its response.
 * Strips markdown code fences defensively since models sometimes wrap JSON
 * in ```json blocks even when told not to.
 */
export async function generateJSON<T>(params: { system: string; prompt: string; maxTokens?: number }): Promise<T> {
  const provider = getAIProvider();
  if (!provider) throw new AINotConfiguredError();

  const raw = await provider.complete({
    ...params,
    system: `${params.system}\n\nRespond with ONLY valid JSON. No markdown, no commentary, no code fences.`,
  });

  const cleaned = raw.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    throw new Error(`AI response was not valid JSON: ${cleaned.slice(0, 200)}`);
  }
}

export { AINotConfiguredError };
export type { AIProvider };
