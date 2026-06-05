/**
 * AI Provider with Automatic Fallback
 *
 * Theory: Production AI workloads must survive provider outages.
 * This wrapper adds transparent retry + fallback to any AIProvider.
 * If the primary fails after N retries, the secondary is attempted once.
 * All delays are configurable; defaults are conservative (3 retries,
 * 500ms base delay with exponential backoff capped at 8s).
 *
 * Usage:
 *   const primary = createProvider(env);
 *   const fallback = createFallbackProvider(env); // e.g. Ollama
 *   const resilient = createProviderWithFallback(primary, fallback);
 *   const answer = await resilient.chatCompletion(messages);
 */

import { logger } from "../logger";
import {
  type AIProvider,
  AIProviderError,
  type ChatMessage,
  type ChatOptions,
  type ChatResponse,
} from "./provider";

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

export interface FallbackOptions {
  maxRetries?: number; // Default 3
  retryDelayMs?: number; // Base delay, default 500
  maxDelayMs?: number; // Cap for exponential backoff, default 8000
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function backoff(baseMs: number, attempt: number, capMs: number): number {
  const jitter = Math.random() * 0.3 * baseMs; // ±30% jitter
  const delay = Math.min(baseMs * 2 ** attempt, capMs);
  return Math.round(delay + jitter);
}

// ---------------------------------------------------------------------------
// Wrapper
// ---------------------------------------------------------------------------

export function createProviderWithFallback(
  primary: AIProvider,
  fallback: AIProvider,
  options: FallbackOptions = {},
): AIProvider {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelay = options.retryDelayMs ?? 500;
  const maxDelay = options.maxDelayMs ?? 8000;

  async function tryPrimary<T>(operation: () => Promise<T>, label: string): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        logger.warn(
          { provider: primary.name, attempt, label, error: lastError.message },
          "primary provider failed, retrying",
        );
        if (attempt < maxRetries) {
          const delay = backoff(baseDelay, attempt, maxDelay);
          await sleep(delay);
        }
      }
    }

    throw lastError ?? new AIProviderError("Primary exhausted retries", "PRIMARY_EXHAUSTED");
  }

  async function tryFallback<T>(operation: () => Promise<T>, label: string): Promise<T> {
    try {
      logger.info({ provider: fallback.name, label }, "falling back to secondary provider");
      return await operation();
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logger.error(
        { provider: fallback.name, label, error: error.message },
        "fallback provider also failed",
      );
      throw error;
    }
  }

  return {
    get name() {
      return `${primary.name}+${fallback.name}`;
    },

    async chatCompletion(messages: ChatMessage[], opts?: ChatOptions): Promise<ChatResponse> {
      try {
        return await tryPrimary(() => primary.chatCompletion(messages, opts), "chatCompletion");
      } catch {
        return await tryFallback(() => fallback.chatCompletion(messages, opts), "chatCompletion");
      }
    },

    async streamChatCompletion(
      messages: ChatMessage[],
      onChunk: (chunk: string) => void,
      opts?: ChatOptions,
    ): Promise<void> {
      try {
        return await tryPrimary(
          () => primary.streamChatCompletion(messages, onChunk, opts),
          "streamChatCompletion",
        );
      } catch {
        return await tryFallback(
          () => fallback.streamChatCompletion(messages, onChunk, opts),
          "streamChatCompletion",
        );
      }
    },
  };
}

// ---------------------------------------------------------------------------
// Convenience: build from env
// ---------------------------------------------------------------------------

export function createResilientProvider(
  env: Record<string, string | undefined> = process.env,
): AIProvider {
  const { createProvider } = require("./provider");

  const primary = createProvider(env);

  // Fallback only if OLLAMA_BASE_URL is set (local Ollama is the natural fallback)
  if (env.OLLAMA_BASE_URL) {
    const fallback = createProvider({
      ...env,
      AI_PROVIDER: "ollama",
    });
    return createProviderWithFallback(primary, fallback);
  }

  return primary;
}
