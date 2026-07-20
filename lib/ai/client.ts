import "server-only";

import OpenAI from "openai";

import { lazy } from "@/lib/lazy";

// xAI's API is OpenAI-compatible; only generation runs here. Embeddings are
// local (lib/ingest/embed.ts) because xAI exposes no embeddings endpoint.
const globalForGrok = globalThis as unknown as { grok?: OpenAI };

function createGrokClient() {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    throw new Error("XAI_API_KEY is not set — copy .env.example to .env and fill it in.");
  }
  return new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" });
}

export const grok: OpenAI = lazy(() => {
  globalForGrok.grok ??= createGrokClient();
  return globalForGrok.grok;
});

export const GROK_MODEL = process.env.XAI_CHAT_MODEL ?? "grok-4-fast";
