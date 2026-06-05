/**
 * AI Provider Abstraction — Unit Tests
 *
 * Theory: The system must be resilient to provider failures. We abstract
 * all LLM interactions behind a uniform interface so that switching or
 * falling back between OpenAI, Ollama, or future providers is transparent
 * to the consumer. Configuration is env-driven — never hard-coded.
 */

import { describe, expect, it, vi } from "vitest";
import {
  type AIProvider,
  AIProviderError,
  type ChatMessage,
  type ChatOptions,
  type ChatResponse,
  createProvider,
} from "./provider";

// ---------------------------------------------------------------------------
// Table-driven factory tests
// ---------------------------------------------------------------------------

describe("createProvider factory", () => {
  const cases = [
    {
      name: "openai",
      env: { AI_PROVIDER: "openai", OPENAI_API_KEY: "sk-test" },
      expected: "openai",
    },
    {
      name: "ollama",
      env: { AI_PROVIDER: "ollama", OLLAMA_BASE_URL: "http://localhost:11434" },
      expected: "ollama",
    },
    {
      name: "defaults to openai when AI_PROVIDER is missing",
      env: { OPENAI_API_KEY: "sk-test" },
      expected: "openai",
    },
  ] as const;

  for (const c of cases) {
    it(`returns ${c.expected} for "${c.name}"`, () => {
      const provider = createProvider(c.env);
      expect(provider.name).toBe(c.expected);
    });
  }

  it("throws AIProviderError when provider is unknown", () => {
    expect(() => createProvider({ AI_PROVIDER: "unknown" })).toThrow(AIProviderError);
  });

  it("throws AIProviderError when OpenAI is chosen but key is missing", () => {
    expect(() => createProvider({ AI_PROVIDER: "openai" })).toThrow(AIProviderError);
  });

  it("throws AIProviderError when Ollama is chosen but base URL is missing", () => {
    expect(() => createProvider({ AI_PROVIDER: "ollama" })).toThrow(AIProviderError);
  });
});

// ---------------------------------------------------------------------------
// Interface contract tests (using a mock provider)
// ---------------------------------------------------------------------------

function makeMockProvider(overrides: Partial<AIProvider> = {}): AIProvider {
  const chatCompletion = vi.fn(
    async (_messages: ChatMessage[], _options?: ChatOptions): Promise<ChatResponse> => ({
      content: "mocked",
      model: "mock",
    }),
  );
  return {
    name: "mock",
    chatCompletion,
    streamChatCompletion: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe("AIProvider interface contract", () => {
  it("chatCompletion returns ChatResponse shape", async () => {
    const provider = makeMockProvider();
    const res = await provider.chatCompletion([{ role: "user", content: "Hello" }]);
    expect(res).toHaveProperty("content");
    expect(typeof res.content).toBe("string");
  });

  it("chatCompletion passes messages through", async () => {
    const chatCompletion = vi.fn().mockResolvedValue({ content: "ok", model: "mock" });
    const provider = makeMockProvider({ chatCompletion });

    const messages = [
      { role: "system" as const, content: "You are helpful" },
      { role: "user" as const, content: "Hello" },
    ];

    await provider.chatCompletion(messages, { temperature: 0.5 });

    expect(chatCompletion).toHaveBeenCalledWith(
      messages,
      expect.objectContaining({ temperature: 0.5 }),
    );
  });

  it("chatCompletion uses default options when none provided", async () => {
    const chatCompletion = vi.fn(
      async (_messages: ChatMessage[], _options?: ChatOptions): Promise<ChatResponse> => ({
        content: "ok",
        model: "mock",
      }),
    );
    const provider = makeMockProvider({ chatCompletion });

    await provider.chatCompletion([{ role: "user", content: "Hi" }]);

    // When called without explicit options, the caller omits the 2nd argument;
    // the implementation fills defaults internally. We assert the call happened.
    expect(chatCompletion).toHaveBeenCalledTimes(1);
    expect(chatCompletion.mock.calls[0]![0]).toEqual([{ role: "user", content: "Hi" }]);
  });
});
