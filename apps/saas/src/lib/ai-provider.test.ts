import { describe, expect, it } from "vitest";

import {
  assistantAiSystemPrompt,
  buildAssistantAiPrompt,
  defaultAssistantAiModel,
  generateAssistantAiSummary,
  getAssistantAiConfig,
  type AssistantAiCompletionInput,
  type AssistantAiConfig
} from "./ai-provider";
import type { AssistantRecommendation } from "./types";

const config: AssistantAiConfig = {
  provider: "anthropic",
  apiKey: "test-key",
  model: defaultAssistantAiModel
};

function env(values: Record<string, string> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...values } as NodeJS.ProcessEnv;
}

function recommendation(overrides: Partial<AssistantRecommendation> = {}): AssistantRecommendation {
  return {
    id: "backlog:task-1",
    organizationId: "org-1",
    siteId: "site-1",
    title: "Update SEO title",
    rationale: "Search snippets can underperform.",
    nextStep: "Assign or schedule this task before preparing a safe operation preview.",
    priority: "high",
    source: {
      type: "backlog_task",
      id: "task-1",
      label: "Backlog task",
      url: "https://example.com/post",
      detail: "todo / high"
    },
    action: {
      type: "safe_preview",
      label: "Prepare preview",
      enabled: true,
      requiresManualConfirmation: true,
      targetTaskId: "task-1",
      disabledReason: null
    },
    noMutation: true,
    safeguards: ["recommendation_only"],
    ...overrides
  };
}

describe("getAssistantAiConfig", () => {
  it("returns null while the provider or key is not configured", () => {
    expect(getAssistantAiConfig(env())).toBeNull();
    expect(getAssistantAiConfig(env({ SCCC_AI_PROVIDER: "anthropic" }))).toBeNull();
    expect(getAssistantAiConfig(env({ SCCC_AI_API_KEY: "key" }))).toBeNull();
  });

  it("returns null for unsupported providers", () => {
    expect(
      getAssistantAiConfig(
        env({
          SCCC_AI_PROVIDER: "other-provider",
          SCCC_AI_API_KEY: "key"
        })
      )
    ).toBeNull();
  });

  it("parses the anthropic provider with the default model", () => {
    expect(
      getAssistantAiConfig(
        env({
          SCCC_AI_PROVIDER: "Anthropic",
          SCCC_AI_API_KEY: " key "
        })
      )
    ).toEqual({
      provider: "anthropic",
      apiKey: "key",
      model: defaultAssistantAiModel
    });
  });

  it("honors a configured model override", () => {
    expect(
      getAssistantAiConfig(
        env({
          SCCC_AI_PROVIDER: "anthropic",
          SCCC_AI_API_KEY: "key",
          SCCC_AI_MODEL: "claude-haiku-4-5"
        })
      )?.model
    ).toBe("claude-haiku-4-5");
  });
});

describe("buildAssistantAiPrompt", () => {
  it("includes only recommendation display fields", () => {
    const prompt = buildAssistantAiPrompt([recommendation()]);

    expect(prompt).toContain("[high] Update SEO title");
    expect(prompt).toContain("Evidence: Search snippets can underperform.");
    expect(prompt).toContain("Source: backlog task (todo / high)");
    expect(prompt).not.toContain("test-key");
  });

  it("bounds the prompt to the top recommendations", () => {
    const prompt = buildAssistantAiPrompt(
      Array.from({ length: 8 }, (_, index) =>
        recommendation({ title: `Recommendation ${index + 1}` })
      )
    );

    expect(prompt).toContain("Recommendation 5");
    expect(prompt).not.toContain("Recommendation 6");
  });
});

describe("generateAssistantAiSummary", () => {
  it("returns the trimmed provider completion with provider metadata", async () => {
    const calls: AssistantAiCompletionInput[] = [];
    const summary = await generateAssistantAiSummary({
      config,
      recommendations: [recommendation()],
      completer: async (input) => {
        calls.push(input);
        return "  Fix the SEO title first.  ";
      }
    });

    expect(summary).toEqual({
      text: "Fix the SEO title first.",
      provider: "anthropic",
      model: defaultAssistantAiModel
    });
    expect(calls[0]?.system).toBe(assistantAiSystemPrompt);
    expect(calls[0]?.model).toBe(defaultAssistantAiModel);
    expect(calls[0]?.prompt).toContain("Update SEO title");
  });

  it("returns null without calling the provider when there are no recommendations", async () => {
    let called = false;
    const summary = await generateAssistantAiSummary({
      config,
      recommendations: [],
      completer: async () => {
        called = true;
        return "unused";
      }
    });

    expect(summary).toBeNull();
    expect(called).toBe(false);
  });

  it("returns null for empty completions", async () => {
    const summary = await generateAssistantAiSummary({
      config,
      recommendations: [recommendation()],
      completer: async () => "   "
    });

    expect(summary).toBeNull();
  });

  it("bounds oversized completions", async () => {
    const summary = await generateAssistantAiSummary({
      config,
      recommendations: [recommendation()],
      completer: async () => "x".repeat(5000)
    });

    expect(summary?.text.length).toBe(2000);
    expect(summary?.text.endsWith("...")).toBe(true);
  });

  it("propagates provider failures so callers can fall back without charging", async () => {
    await expect(
      generateAssistantAiSummary({
        config,
        recommendations: [recommendation()],
        completer: async () => {
          throw new Error("provider unavailable");
        }
      })
    ).rejects.toThrow("provider unavailable");
  });
});
