import "server-only";

import { GoogleGenAI } from "@google/genai";

import { lazy } from "@/lib/lazy";

import type { ChatProvider, ChatRequest, ChatResult } from "./types";

const globalForGemini = globalThis as unknown as { gemini?: GoogleGenAI };

function createGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set — copy .env.example to .env and fill it in.");
  }
  return new GoogleGenAI({ apiKey });
}

const client: GoogleGenAI = lazy(() => {
  globalForGemini.gemini ??= createGeminiClient();
  return globalForGemini.gemini;
});

// "gemini-flash-latest" is a maintained alias (currently gemini-3.5-flash);
// pinned model ids like gemini-2.5-flash are being retired for new API keys.
const GEMINI_MODEL = process.env.GEMINI_CHAT_MODEL ?? "gemini-flash-latest";

/**
 * Gemini generation provider. The grounding prompt is passed as a system
 * instruction and the sources+question as the user turn, mirroring the
 * OpenAI-compatible providers so the prompt structure stays identical.
 */
export const geminiProvider: ChatProvider = {
  name: "gemini",
  async generate({ system, user, temperature = 0.2 }: ChatRequest): Promise<ChatResult> {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: user,
      config: {
        systemInstruction: system,
        temperature,
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("Gemini returned an empty answer.");
    }
    return { text, model: response.modelVersion ?? GEMINI_MODEL };
  },
};
