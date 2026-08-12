export interface CompletionParams {
  system: string;
  prompt: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProvider {
  id: "anthropic" | "openai";
  displayName: string;
  isConfigured(): boolean;
  complete(params: CompletionParams): Promise<string>;
}

export class AINotConfiguredError extends Error {
  constructor() {
    super("No AI provider is configured. Set ANTHROPIC_API_KEY or OPENAI_API_KEY to enable AI features.");
    this.name = "AINotConfiguredError";
  }
}
