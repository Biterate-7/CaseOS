import "server-only";

/** A single grounded-generation request, provider-agnostic. */
export type ChatRequest = {
  system: string;
  user: string;
  temperature?: number;
};

export type ChatResult = {
  /** The generated answer text. */
  text: string;
  /** The concrete model id that produced the answer (for audit + AIInteraction.model). */
  model: string;
};

/**
 * The single seam the generation layer depends on. Every provider (Gemini,
 * Grok, OpenAI, …) implements this, so switching providers never touches
 * retrieval, prompting, citation parsing, or persistence.
 */
export interface ChatProvider {
  /** Stable identifier, e.g. "gemini" | "grok" | "openai". */
  readonly name: string;
  generate(request: ChatRequest): Promise<ChatResult>;
}
