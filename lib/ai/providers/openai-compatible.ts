import "server-only";

import OpenAI from "openai";

import { lazy } from "@/lib/lazy";

import type { ChatProvider, ChatRequest, ChatResult } from "./types";

type OpenAICompatibleConfig = {
  name: string;
  /** env var holding the API key, e.g. "XAI_API_KEY". */
  apiKeyEnv: string;
  /** OpenAI-compatible base URL; omit for OpenAI itself. */
  baseURL?: string;
  model: string;
};

/**
 * Builds a ChatProvider around any OpenAI-compatible chat-completions API.
 * Grok (xAI) and OpenAI both use this — only base URL, key, and model differ.
 */
export function createOpenAICompatibleProvider(
  config: OpenAICompatibleConfig
): ChatProvider {
  const store = globalThis as unknown as Record<string, OpenAI | undefined>;
  const cacheKey = `openai_compatible_${config.name}`;

  const client: OpenAI = lazy(() => {
    const apiKey = process.env[config.apiKeyEnv];
    if (!apiKey) {
      throw new Error(
        `${config.apiKeyEnv} is not set — copy .env.example to .env and fill it in.`
      );
    }
    store[cacheKey] ??= new OpenAI({ apiKey, baseURL: config.baseURL });
    return store[cacheKey]!;
  });

  return {
    name: config.name,
    async generate({ system, user, temperature = 0.2 }: ChatRequest): Promise<ChatResult> {
      const completion = await client.chat.completions.create({
        model: config.model,
        temperature,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      });
      const text = completion.choices[0]?.message?.content?.trim();
      if (!text) {
        throw new Error(`${config.name} returned an empty answer.`);
      }
      return { text, model: completion.model ?? config.model };
    },
  };
}
