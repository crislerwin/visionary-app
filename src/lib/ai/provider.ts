/**
 * AI Provider Abstraction
 *
 * Theory: All LLM interactions are hidden behind a uniform interface so that
 * the caller does not care whether OpenAI, Ollama, or a future provider
 * is answering. Configuration is fully env-driven — no models or keys
 * are hard-coded. The factory validates credentials at creation time,
 * failing fast rather than failing at runtime.
 */

import { logger } from "../logger";

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

export type MessageRole = "system" | "user" | "assistant";

export interface ChatMessage {
  role: MessageRole;
  content: string;
}

export interface ChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ChatResponse {
  content: string;
  model: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AIProvider {
  readonly name: string;
  chatCompletion(messages: ChatMessage[], options?: ChatOptions): Promise<ChatResponse>;
  streamChatCompletion(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options?: ChatOptions,
  ): Promise<void>;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class AIProviderError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "AIProviderError";
  }
}

// ---------------------------------------------------------------------------
// OpenAI implementation
// ---------------------------------------------------------------------------

class OpenAIProvider implements AIProvider {
  readonly name = "openai";
  private readonly apiKey: string;
  private readonly baseUrl = "https://api.openai.com/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async chatCompletion(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 2048;

    logger.debug({ provider: this.name, model }, "chatCompletion start");

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "OpenAI chatCompletion failed");
      throw new AIProviderError(`OpenAI returned ${res.status}: ${body}`, "OPENAI_HTTP_ERROR");
    }

    const data = (await res.json()) as {
      choices: Array<{
        message: { content: string };
      }>;
      model: string;
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };

    const content = data.choices[0]?.message?.content ?? "";

    logger.debug({ model: data.model }, "chatCompletion done");

    return {
      content,
      model: data.model,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    };
  }

  async streamChatCompletion(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options: ChatOptions = {},
  ): Promise<void> {
    const model = options.model ?? process.env.OPENAI_MODEL ?? "gpt-4o-mini";
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 2048;

    logger.debug({ provider: this.name, model }, "streamChatCompletion start");

    const res = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "OpenAI streamChatCompletion failed");
      throw new AIProviderError(`OpenAI returned ${res.status}: ${body}`, "OPENAI_HTTP_ERROR");
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new AIProviderError("No response body", "OPENAI_NO_BODY");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed === "data: [DONE]") continue;
        if (!trimmed.startsWith("data: ")) continue;

        try {
          const json = JSON.parse(trimmed.slice(6)) as {
            choices?: Array<{ delta?: { content?: string } }>;
          };
          const chunk = json.choices?.[0]?.delta?.content;
          if (chunk) onChunk(chunk);
        } catch {
          // Ignore malformed SSE lines
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Ollama implementation
// ---------------------------------------------------------------------------

class OllamaProvider implements AIProvider {
  readonly name = "ollama";
  private readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
  }

  async chatCompletion(messages: ChatMessage[], options: ChatOptions = {}): Promise<ChatResponse> {
    const model = options.model ?? process.env.OLLAMA_MODEL ?? "llama3.2";
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 2048;

    logger.debug({ provider: this.name, model }, "chatCompletion start");

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        options: { temperature, num_predict: maxTokens },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "Ollama chatCompletion failed");
      throw new AIProviderError(`Ollama returned ${res.status}: ${body}`, "OLLAMA_HTTP_ERROR");
    }

    const data = (await res.json()) as {
      message?: { content: string };
    };

    const content = data.message?.content ?? "";

    logger.debug({ model }, "chatCompletion done");

    return { content, model };
  }

  async streamChatCompletion(
    messages: ChatMessage[],
    onChunk: (chunk: string) => void,
    options: ChatOptions = {},
  ): Promise<void> {
    const model = options.model ?? process.env.OLLAMA_MODEL ?? "llama3.2";
    const temperature = options.temperature ?? 0.7;
    const maxTokens = options.maxTokens ?? 2048;

    logger.debug({ provider: this.name, model }, "streamChatCompletion start");

    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages,
        stream: true,
        options: { temperature, num_predict: maxTokens },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      logger.error({ status: res.status, body }, "Ollama streamChatCompletion failed");
      throw new AIProviderError(`Ollama returned ${res.status}: ${body}`, "OLLAMA_HTTP_ERROR");
    }

    const reader = res.body?.getReader();
    if (!reader) {
      throw new AIProviderError("No response body", "OLLAMA_NO_BODY");
    }

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        try {
          const json = JSON.parse(trimmed) as {
            message?: { content?: string };
            done?: boolean;
          };
          const chunk = json.message?.content;
          if (chunk) onChunk(chunk);
          if (json.done) return;
        } catch {
          // Ignore malformed NDJSON lines
        }
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export type ProviderEnv = Record<string, string | undefined>;

export function createProvider(env: ProviderEnv = process.env): AIProvider {
  const providerName = (env.AI_PROVIDER ?? "openai").toLowerCase().trim();

  switch (providerName) {
    case "openai": {
      const apiKey = env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new AIProviderError(
          "OPENAI_API_KEY is required when AI_PROVIDER=openai",
          "MISSING_OPENAI_KEY",
        );
      }
      return new OpenAIProvider(apiKey);
    }

    case "ollama": {
      const baseUrl = env.OLLAMA_BASE_URL;
      if (!baseUrl) {
        throw new AIProviderError(
          "OLLAMA_BASE_URL is required when AI_PROVIDER=ollama",
          "MISSING_OLLAMA_URL",
        );
      }
      return new OllamaProvider(baseUrl);
    }

    default:
      throw new AIProviderError(
        `Unknown AI provider: "${providerName}". Supported: openai, ollama`,
        "UNKNOWN_PROVIDER",
      );
  }
}
