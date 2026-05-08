import type { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { ChatOpenAI } from "@langchain/openai";

export type LLMProvider = "openai" | "generic" | "ollama";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
  baseUrl?: string;
  temperature?: number;
}

function getEnvConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER as LLMProvider) || "openai";
  const model = process.env.LLM_MODEL || "gpt-4o-mini";
  const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || "";
  const baseUrl = process.env.LLM_BASE_URL;
  const temperature = Number(process.env.LLM_TEMPERATURE) || 0.7;

  if (!apiKey) {
    throw new Error("LLM_API_KEY ou OPENAI_API_KEY devem estar configurados");
  }

  return { provider, model, apiKey, baseUrl, temperature };
}

export function createLLM(override?: Partial<LLMConfig>): BaseChatModel {
  const config = { ...getEnvConfig(), ...override };

  switch (config.provider) {
    case "openai":
      return new ChatOpenAI({
        model: config.model,
        apiKey: config.apiKey,
        temperature: config.temperature,
      });

    case "generic": {
      // Generic OpenAI-compatible provider (OpenRouter, Groq, etc.)
      if (!config.baseUrl) {
        throw new Error("LLM_BASE_URL é obrigatório para provider 'generic'");
      }
      return new ChatOpenAI({
        model: config.model,
        apiKey: config.apiKey,
        temperature: config.temperature,
        configuration: {
          baseURL: config.baseUrl,
        },
      });
    }

    case "ollama": {
      // Ollama local server (OpenAI-compatible API)
      const baseUrl = config.baseUrl || "http://localhost:11434";
      return new ChatOpenAI({
        model: config.model || "llama3.2",
        apiKey: config.apiKey || "ollama",
        temperature: config.temperature,
        configuration: {
          baseURL: `${baseUrl}/v1`,
        },
      });
    }

    default:
      throw new Error(`Provider LLM não suportado: ${config.provider}`);
  }
}
