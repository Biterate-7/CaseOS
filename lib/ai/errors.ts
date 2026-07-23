import "server-only";

/**
 * AI provider error handling.
 *
 * Two jobs, both of which were missing:
 *
 * 1. Classify provider failures into a small set of codes, so the UI can say
 *    something useful and the caller can decide whether retrying is sensible.
 *
 * 2. Stop provider responses reaching the user. Every SDK here puts its raw
 *    HTTP body in `Error.message` — the Gemini client's message for a busy
 *    model is the literal JSON `{"error":{"code":503,"status":"UNAVAILABLE",
 *    ...}}`. `lib/actions/ai.ts` forwarded `error.message` verbatim, so that
 *    JSON rendered in the research panel.
 *
 * Nothing in this module returns provider text to a caller. `userMessage` is
 * always one of the fixed strings below; the original is logged server-side
 * and dropped.
 */

export type AiErrorCode =
  | "OVERLOADED" // 503 — provider capacity, transient
  | "RATE_LIMITED" // 429 — our quota, backing off does not help immediately
  | "TIMEOUT" // network stall or aborted socket
  | "NETWORK" // DNS, TLS, connection refused
  | "AUTH" // 401/403 — bad or missing key
  | "BAD_REQUEST" // 400 — malformed request, our bug
  | "SERVER" // 500/502/504 — provider fault
  | "EMPTY" // provider replied, but with nothing usable
  | "UNKNOWN";

const USER_MESSAGES: Record<AiErrorCode, string> = {
  OVERLOADED:
    "The AI service is currently experiencing high demand. Please try again in a few moments.",
  RATE_LIMITED:
    "Too many requests. Please wait a moment before trying again.",
  TIMEOUT:
    "Unable to reach the AI service. Check your connection and try again.",
  NETWORK:
    "Unable to reach the AI service. Check your connection and try again.",
  AUTH: "The AI service is not configured correctly. Contact your administrator.",
  BAD_REQUEST: "Something went wrong while generating the response.",
  SERVER: "The AI service is temporarily unavailable. Please try again shortly.",
  EMPTY: "The AI service returned an empty response. Please try again.",
  UNKNOWN: "Something went wrong while generating the response.",
};

/**
 * Only failures that a later attempt could plausibly survive.
 *
 * 429 is deliberately excluded: a rate limit means we are over quota, and
 * retrying inside the same request burns the remaining budget and makes the
 * user wait longer for the same failure.
 *
 * 400/401/403 are excluded because they are deterministic — the same request
 * fails identically every time.
 */
const RETRYABLE: ReadonlySet<AiErrorCode> = new Set([
  "OVERLOADED",
  "TIMEOUT",
  "NETWORK",
  "SERVER",
]);

export class AiError extends Error {
  readonly code: AiErrorCode;
  readonly userMessage: string;
  readonly retryable: boolean;
  readonly status: number | null;

  constructor(code: AiErrorCode, cause?: unknown, status: number | null = null) {
    // `message` is for logs only and never reaches the client.
    super(`AI provider error: ${code}`);
    this.name = "AiError";
    this.code = code;
    this.userMessage = USER_MESSAGES[code];
    this.retryable = RETRYABLE.has(code);
    this.status = status;
    this.cause = cause;
  }
}

/** Digs an HTTP status out of the various shapes SDKs throw. */
function statusOf(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null;
  const e = error as Record<string, unknown>;

  for (const key of ["status", "statusCode", "code"]) {
    const value = e[key];
    if (typeof value === "number" && value >= 100 && value < 600) return value;
  }
  // Gemini nests it: { error: { code: 503, status: "UNAVAILABLE" } }
  const nested = e.error as Record<string, unknown> | undefined;
  if (nested && typeof nested.code === "number") return nested.code;

  // Last resort: the SDK stringified the body into the message.
  if (typeof e.message === "string") {
    const match = e.message.match(/\b(4\d{2}|5\d{2})\b/);
    if (match) return Number(match[1]);
  }
  return null;
}

export function classifyAiError(error: unknown): AiError {
  if (error instanceof AiError) return error;

  const status = statusOf(error);
  const raw =
    error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const text = raw.toLowerCase();

  if (status === 503) return new AiError("OVERLOADED", error, status);
  if (status === 429) return new AiError("RATE_LIMITED", error, status);
  if (status === 401 || status === 403) return new AiError("AUTH", error, status);
  if (status === 400) return new AiError("BAD_REQUEST", error, status);
  if (status === 500 || status === 502 || status === 504) {
    return new AiError("SERVER", error, status);
  }

  // Status-free failures: read the shape instead.
  if (
    text.includes("timeout") ||
    text.includes("timed out") ||
    text.includes("aborted") ||
    (error as { name?: string })?.name === "AbortError"
  ) {
    return new AiError("TIMEOUT", error, status);
  }
  if (
    text.includes("fetch failed") ||
    text.includes("econnrefused") ||
    text.includes("enotfound") ||
    text.includes("econnreset") ||
    text.includes("network")
  ) {
    return new AiError("NETWORK", error, status);
  }
  if (text.includes("overloaded") || text.includes("unavailable")) {
    return new AiError("OVERLOADED", error, status);
  }
  if (text.includes("quota") || text.includes("rate limit")) {
    return new AiError("RATE_LIMITED", error, status);
  }
  if (text.includes("api key") || text.includes("api_key") || text.includes("unauthenticated")) {
    return new AiError("AUTH", error, status);
  }
  if (text.includes("empty")) return new AiError("EMPTY", error, status);

  return new AiError("UNKNOWN", error, status);
}

/**
 * Server-side log. The full provider payload goes here and nowhere else.
 *
 * Deliberately not `console.error(error)` on the raw value — that can dump a
 * request object carrying the API key into the log.
 */
export function logAiError(context: string, error: AiError) {
  const cause = error.cause;
  console.error(
    JSON.stringify({
      event: "ai_error",
      context,
      code: error.code,
      status: error.status,
      retryable: error.retryable,
      providerMessage:
        cause instanceof Error ? cause.message.slice(0, 800) : String(cause).slice(0, 800),
    })
  );
}

const BASE_DELAY_MS = 1000;
const MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Runs `operation`, retrying transient failures with exponential backoff.
 *
 * Three attempts at 1s and 2s of waiting — 3s of added latency worst case,
 * which sits inside the route's 60s budget alongside a slow generation.
 *
 * Backoff is capped by attempt count rather than a deadline because the
 * caller (a server action) has no way to report progress mid-flight; a longer
 * ladder would just look like a hang.
 */
export async function withAiRetry<T>(
  context: string,
  operation: () => Promise<T>
): Promise<T> {
  let lastError: AiError | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await operation();
    } catch (error) {
      const aiError = classifyAiError(error);
      lastError = aiError;

      if (!aiError.retryable || attempt === MAX_ATTEMPTS) {
        logAiError(context, aiError);
        throw aiError;
      }

      const delay = BASE_DELAY_MS * 2 ** (attempt - 1);
      console.warn(
        JSON.stringify({
          event: "ai_retry",
          context,
          code: aiError.code,
          attempt,
          nextDelayMs: delay,
        })
      );
      await sleep(delay);
    }
  }

  // Unreachable: the loop either returns or throws.
  throw lastError ?? new AiError("UNKNOWN");
}
