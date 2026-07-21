import "server-only";

import { createOpenAICompatibleProvider } from "./openai-compatible";

export const openaiProvider = createOpenAICompatibleProvider({
  name: "openai",
  apiKeyEnv: "OPENAI_API_KEY",
  // default base URL (api.openai.com)
  model: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
});
