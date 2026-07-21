import "server-only";

import { geminiProvider } from "./providers/gemini";
import { grokProvider } from "./providers/grok";
import { openaiProvider } from "./providers/openai";
import type { ChatProvider } from "./providers/types";

const PROVIDERS: Record<string, ChatProvider> = {
  gemini: geminiProvider,
  grok: grokProvider,
  openai: openaiProvider,
};

/** The active generation provider, selected by AI_PROVIDER (default: gemini). */
export function getChatProvider(): ChatProvider {
  const name = (process.env.AI_PROVIDER ?? "gemini").toLowerCase();
  const provider = PROVIDERS[name];
  if (!provider) {
    throw new Error(
      `Unknown AI_PROVIDER "${name}". Valid values: ${Object.keys(PROVIDERS).join(", ")}.`
    );
  }
  return provider;
}

export type { ChatProvider } from "./providers/types";
