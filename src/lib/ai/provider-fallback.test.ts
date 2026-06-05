/**
 * AI Provider with Fallback — Unit Tests
 *
 * Theory: If the primary provider fails (network, rate-limit, etc.),
 * we should transparently try a secondary provider before giving up.
 * This is critical for production resilience. The fallback provider
 * is configured via env; if not configured, the primary is the only
 * provider and errors propagate normally.
 */

import { describe, expect, it, vi } from "vitest";
import type { AIProvider, ChatMessage, ChatOptions, ChatResponse } from "./provider";
import { createProviderWithFallback } from "./provider-fallback";

function makeStubProvider(name: string): AIProvider {
  return {
    name,
    chatCompletion: vi.fn(
      async (_messages: ChatMessage[], _options?: ChatOptions): Promise<ChatResponse> => ({
        content: "ok",
        model: name,
      }),
    ),
    streamChatCompletion: vi.fn(
      async (
        _messages: ChatMessage[],
        onChunk: (chunk: string) => void,
        _options?: ChatOptions,
      ): Promise<void> => {
        onChunk("ok");
      },
    ),
  };
}

describe("createProviderWithFallback", () => {
  it("delegates to primary when it succeeds", async () => {
    const primary = makeStubProvider("primary");
    const fallback = makeStubProvider("fallback");

    const provider = createProviderWithFallback(primary, fallback);
    const res = await provider.chatCompletion([{ role: "user", content: "hello" }]);

    expect(res.content).toBe("ok");
    expect(primary.chatCompletion).toHaveBeenCalledTimes(1);
    expect(fallback.chatCompletion).not.toHaveBeenCalled();
  });

  it("retries primary up to maxRetries before falling back", async () => {
    const primary = makeStubProvider("primary");
    (primary.chatCompletion as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(new Error("fail 1"))
      .mockRejectedValueOnce(new Error("fail 2"))
      .mockResolvedValueOnce({ content: "primary-recovered", model: "primary" });

    const fallback = makeStubProvider("fallback");

    const provider = createProviderWithFallback(primary, fallback, {
      maxRetries: 2,
    });
    const res = await provider.chatCompletion([{ role: "user", content: "hello" }]);

    expect(res.content).toBe("primary-recovered");
    expect(primary.chatCompletion).toHaveBeenCalledTimes(3);
    expect(fallback.chatCompletion).not.toHaveBeenCalled();
  });

  it("falls back when primary exhausts all retries", async () => {
    const primary = makeStubProvider("primary");
    (primary.chatCompletion as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("primary-down"),
    );

    const fallback = makeStubProvider("fallback");
    (fallback.chatCompletion as ReturnType<typeof vi.fn>).mockResolvedValue({
      content: "fallback-ok",
      model: "fallback",
    });

    const provider = createProviderWithFallback(primary, fallback, {
      maxRetries: 1,
    });
    const res = await provider.chatCompletion([{ role: "user", content: "hello" }]);

    expect(res.content).toBe("fallback-ok");
    expect(primary.chatCompletion).toHaveBeenCalledTimes(2); // initial + 1 retry
    expect(fallback.chatCompletion).toHaveBeenCalledTimes(1);
  });

  it("propagates error when both providers fail", async () => {
    const primary = makeStubProvider("primary");
    (primary.chatCompletion as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("primary-down"),
    );

    const fallback = makeStubProvider("fallback");
    (fallback.chatCompletion as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("fallback-down"),
    );

    const provider = createProviderWithFallback(primary, fallback, {
      maxRetries: 0,
    });

    await expect(provider.chatCompletion([{ role: "user", content: "hello" }])).rejects.toThrow(
      "fallback-down",
    );
  });

  it("passes through messages and options to fallback", async () => {
    const primary = makeStubProvider("primary");
    (primary.chatCompletion as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("fail"));

    const fallback = makeStubProvider("fallback");

    const provider = createProviderWithFallback(primary, fallback, {
      maxRetries: 0,
    });

    const messages: ChatMessage[] = [
      { role: "system", content: "You are helpful" },
      { role: "user", content: "Hi" },
    ];

    await provider.chatCompletion(messages, { temperature: 0.2 });

    expect(fallback.chatCompletion).toHaveBeenCalledWith(
      messages,
      expect.objectContaining({ temperature: 0.2 }),
    );
  });
});

describe("streamChatCompletion fallback", () => {
  it("streams from primary when it succeeds", async () => {
    const onChunk = vi.fn();
    const primary = makeStubProvider("primary");
    (primary.streamChatCompletion as ReturnType<typeof vi.fn>).mockImplementation(
      async (_messages: ChatMessage[], cb: (chunk: string) => void) => {
        cb("hello");
        cb(" world");
      },
    );

    const fallback = makeStubProvider("fallback");

    const provider = createProviderWithFallback(primary, fallback);
    await provider.streamChatCompletion([{ role: "user", content: "" }], onChunk);

    expect(onChunk).toHaveBeenCalledTimes(2);
    expect(onChunk).toHaveBeenNthCalledWith(1, "hello");
    expect(onChunk).toHaveBeenNthCalledWith(2, " world");
    expect(fallback.streamChatCompletion).not.toHaveBeenCalled();
  });

  it("falls back to secondary when primary stream fails", async () => {
    const onChunk = vi.fn();
    const primary = makeStubProvider("primary");
    (primary.streamChatCompletion as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("stream-fail"),
    );

    const fallback = makeStubProvider("fallback");
    (fallback.streamChatCompletion as ReturnType<typeof vi.fn>).mockImplementation(
      async (_messages: ChatMessage[], cb: (chunk: string) => void) => {
        cb("fb-chunk");
      },
    );

    const provider = createProviderWithFallback(primary, fallback, {
      maxRetries: 0,
    });
    await provider.streamChatCompletion([{ role: "user", content: "" }], onChunk);

    expect(onChunk).toHaveBeenCalledTimes(1);
    expect(onChunk).toHaveBeenCalledWith("fb-chunk");
  });

  it("throws when both stream providers fail", async () => {
    const onChunk = vi.fn();
    const primary = makeStubProvider("primary");
    (primary.streamChatCompletion as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("primary-stream-fail"),
    );

    const fallback = makeStubProvider("fallback");
    (fallback.streamChatCompletion as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("fallback-stream-fail"),
    );

    const provider = createProviderWithFallback(primary, fallback, {
      maxRetries: 0,
    });

    await expect(
      provider.streamChatCompletion([{ role: "user", content: "" }], onChunk),
    ).rejects.toThrow("fallback-stream-fail");
  });
});

describe("retry with exponential backoff", () => {
  it("waits between retries (smoke test for delay presence)", async () => {
    const start = Date.now();
    const primary = makeStubProvider("primary");
    (primary.chatCompletion as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("fail"));

    const fallback = makeStubProvider("fallback");

    const provider = createProviderWithFallback(primary, fallback, {
      maxRetries: 1,
      retryDelayMs: 50,
    });

    try {
      await provider.chatCompletion([{ role: "user", content: "" }]);
    } catch {
      // expected
    }

    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(45); // at least one 50ms delay
  });
});
