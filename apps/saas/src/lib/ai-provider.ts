import Anthropic from "@anthropic-ai/sdk";

import type { AssistantAiSummary, AssistantRecommendation } from "./types";

export const defaultAssistantAiModel = "claude-opus-4-8";
export const supportedAssistantAiProviders = ["anthropic"] as const;

const summaryRecommendationLimit = 5;
const summaryMaxTokens = 1024;
const summaryMaxCharacters = 2000;

export type AssistantAiProvider = (typeof supportedAssistantAiProviders)[number];

export type AssistantAiConfig = {
  provider: AssistantAiProvider;
  apiKey: string;
  model: string;
};

export type AssistantAiCompletionInput = {
  model: string;
  system: string;
  prompt: string;
  maxTokens: number;
};

export type AssistantAiCompleter = (input: AssistantAiCompletionInput) => Promise<string>;

/**
 * Reads the assistant AI provider configuration from the environment. The
 * assistant stays fully deterministic unless both a supported provider and an
 * API key are configured; the key is never logged or persisted anywhere.
 */
export function getAssistantAiConfig(
  env: NodeJS.ProcessEnv = process.env
): AssistantAiConfig | null {
  const provider = env.SCCC_AI_PROVIDER?.trim().toLowerCase();
  const apiKey = env.SCCC_AI_API_KEY?.trim();

  if (!provider || !apiKey) {
    return null;
  }

  if (!supportedAssistantAiProviders.includes(provider as AssistantAiProvider)) {
    return null;
  }

  return {
    provider: provider as AssistantAiProvider,
    apiKey,
    model: env.SCCC_AI_MODEL?.trim() || defaultAssistantAiModel
  };
}

/**
 * Builds the provider prompt from recommendation display fields only. The
 * prompt intentionally carries no credentials, tokens, or tenant secrets, and
 * it is never persisted: it exists only for the outbound provider call.
 */
export function buildAssistantAiPrompt(recommendations: AssistantRecommendation[]): string {
  const lines = recommendations
    .slice(0, summaryRecommendationLimit)
    .map((recommendation, index) =>
      [
        `${index + 1}. [${recommendation.priority}] ${recommendation.title}`,
        `   Evidence: ${recommendation.rationale}`,
        `   Next step: ${recommendation.nextStep}`,
        `   Source: ${recommendation.source.type.replaceAll("_", " ")} (${recommendation.source.detail})`
      ].join("\n")
    );

  return [
    "These are the current SEO recommendations for one WordPress site, ordered by priority:",
    "",
    ...lines,
    "",
    "Summarize the situation for the site operator in 2-4 plain-text sentences: what matters most right now and what to do first. Do not invent facts beyond the recommendations above, do not use markdown, and do not mention that you are an AI."
  ].join("\n");
}

export const assistantAiSystemPrompt =
  "You are the assistant inside an SEO content operations product. You summarize already-computed, deterministic SEO recommendations for a site operator. Be specific, concise, and action-oriented.";

export function createAnthropicAssistantCompleter(config: AssistantAiConfig): AssistantAiCompleter {
  const client = new Anthropic({ apiKey: config.apiKey });

  return async (input) => {
    const response = await client.messages.create({
      model: input.model,
      max_tokens: input.maxTokens,
      system: input.system,
      messages: [{ role: "user", content: input.prompt }]
    });

    if (response.stop_reason === "refusal") {
      return "";
    }

    return response.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n");
  };
}

/**
 * Generates the AI summary for an assistant response. Callers own metering:
 * a non-null result is the only outcome that should consume an AI credit.
 * Provider failures propagate so callers can fall back to the deterministic
 * response without charging.
 */
export async function generateAssistantAiSummary(input: {
  config: AssistantAiConfig;
  recommendations: AssistantRecommendation[];
  completer?: AssistantAiCompleter;
}): Promise<AssistantAiSummary | null> {
  if (input.recommendations.length === 0) {
    return null;
  }

  const completer = input.completer ?? createAnthropicAssistantCompleter(input.config);
  const completion = await completer({
    model: input.config.model,
    system: assistantAiSystemPrompt,
    prompt: buildAssistantAiPrompt(input.recommendations),
    maxTokens: summaryMaxTokens
  });
  const text = completion.trim();

  if (!text) {
    return null;
  }

  return {
    text:
      text.length > summaryMaxCharacters ? `${text.slice(0, summaryMaxCharacters - 3)}...` : text,
    provider: input.config.provider,
    model: input.config.model
  };
}
