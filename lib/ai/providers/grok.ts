import "server-only";

import { createOpenAICompatibleProvider } from "./openai-compatible";

// xAI's API is OpenAI-compatible; only generation runs here. Embeddings are
// local (lib/ingest/embed.ts) because xAI exposes no embeddings endpoint.
export const grokProvider = createOpenAICompatibleProvider({
  name: "grok",
  apiKeyEnv: "XAI_API_KEY",
  baseURL: "https://api.x.ai/v1",
  model: process.env.XAI_CHAT_MODEL ?? "grok-4-fast",
});
