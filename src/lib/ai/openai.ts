import OpenAI from "openai";
import type { AIProvider, CompletionParams } from "./types";

let client: OpenAI | null = null;
function getClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  if (!client) client = new OpenAI({ apiKey });
  return client;
}

export const openaiProvider: AIProvider = {
  id: "openai",
  displayName: "OpenAI",

  isConfigured() {
    return Boolean(process.env.OPENAI_API_KEY?.trim());
  },

  async complete({ system, prompt, maxTokens = 1500, temperature = 0.6 }: CompletionParams) {
    const openai = getClient();
    if (!openai) throw new Error("OpenAI is not configured.");

    const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";

    const completion = await openai.chat.completions.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: system },
        { role: "user", content: prompt },
      ],
    });

    return completion.choices[0]?.message?.content ?? "";
  },
};
