import Anthropic from "@anthropic-ai/sdk";
import type { AIProvider, CompletionParams } from "./types";

let client: Anthropic | null = null;
function getClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) return null;
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export const anthropicProvider: AIProvider = {
  id: "anthropic",
  displayName: "Anthropic Claude",

  isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  },

  async complete({ system, prompt, maxTokens = 1500, temperature = 0.6 }: CompletionParams) {
    const anthropic = getClient();
    if (!anthropic) throw new Error("Anthropic is not configured.");

    const model = process.env.ANTHROPIC_MODEL?.trim() || "claude-sonnet-4-5-20250929";

    const message = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      system,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    return textBlock?.type === "text" ? textBlock.text : "";
  },
};
