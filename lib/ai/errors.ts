import "server-only";

import { randomUUID } from "node:crypto";

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
  | "CANCELLED" // caller went away; not a failure worth reporting
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
  CANCELLED: "The request was cancelled.",
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
export function logAiError(
  context: string,
  error: AiError,
  meta: {
    requestId?: string;
    provider?: string;
    model?: string;
    attempts?: number;
    latencyMs?: number;
  } = {}
) {
  const cause = error.cause;
  console.error(
    JSON.stringify({
      event: "ai_error",
      context,
      requestId: meta.requestId ?? null,
      provider: meta.provider ?? null,
      model: meta.model ?? null,
      code: error.code,
      status: error.status,
      retryable: error.retryable,
      attempts: meta.attempts ?? null,
      latencyMs: meta.latencyMs ?? null,
      // Truncated, and only ever the message string. Never the error object
      // itself, which can carry request headers including the API key.
      providerMessage:
        cause instanceof Error
          ? cause.message.slice(0, 800)
          : String(cause).slice(0, 800),
    })
  );
}

const BASE_DELAY_MS = 1000;
const MAX_ATTEMPTS = 3;

/**
 * Per-attempt ceiling. Three attempts plus 3s of backoff fits inside the
 * route's 60s maxDuration with room for retrieval and persistence.
 */
export const DEFAULT_TIMEOUT_MS = 20_000;

/**
 * Hard ceiling on the whole retry sequence, backoff included.
 *
 * The route declares maxDuration = 60s. Before this existed the worst case
 * was MAX_ATTEMPTS x timeout + backoff = 3 x 45s + 3s = 138s — more than
 * twice the platform budget, so a slow provider produced a platform kill
 * instead of a clean error.
 *
 * 45s leaves ~15s for retrieval (which embeds the query), the persistence
 * transaction, and serialisation. Each attempt is capped at whatever remains,
 * so the total cannot exceed this value no matter how attempts and backoff
 * combine.
 */
export const DEFAULT_BUDGET_MS = 45_000;

/** Abortable sleep, so backoff does not outlive a cancelled request. */
function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new AiError("CANCELLED"));
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      // Clearing the timer is what stops this promise dangling until the
      // delay elapses on a request nobody is waiting for any more.
      clearTimeout(timer);
      reject(new AiError("CANCELLED"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

export type AiCallMeta = {
  /** Correlates every log line for one logical request. */
  requestId: string;
  provider: string;
  model: string;
};

export function newRequestId(): string {
  return randomUUID();
}

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
  operation: (signal: AbortSignal) => Promise<T>,
  options: {
    /** Caller cancellation, e.g. the client disconnecting. */
    signal?: AbortSignal;
    /** Cap for a single attempt. */
    timeoutMs?: number;
    /** Hard ceiling for the whole sequence, backoff included. */
    budgetMs?: number;
    meta?: Partial<AiCallMeta>;
  } = {}
): Promise<T> {
  const {
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    budgetMs = DEFAULT_BUDGET_MS,
    meta = {},
  } = options;
  const deadline = Date.now() + budgetMs;
  const requestId = meta.requestId ?? newRequestId();
  const started = Date.now();
  let lastError: AiError | undefined;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    // Fresh signal per attempt, capped by whatever remains of the overall
    // budget. This is what makes the worst case bounded: the sum of every
    // attempt plus every backoff can never exceed budgetMs.
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      const exhausted = lastError ?? new AiError("TIMEOUT");
      logAiError(context, exhausted, {
        requestId,
        provider: meta.provider,
        model: meta.model,
        attempts: attempt - 1,
        latencyMs: Date.now() - started,
      });
      throw exhausted;
    }
    const timeout = AbortSignal.timeout(Math.min(timeoutMs, remaining));
    const combined = signal
      ? AbortSignal.any([signal, timeout])
      : timeout;

    try {
      const result = await operation(combined);
      if (attempt > 1) {
        console.warn(
          JSON.stringify({
            event: "ai_recovered",
            context,
            requestId,
            provider: meta.provider ?? null,
            model: meta.model ?? null,
            attempt,
            latencyMs: Date.now() - started,
          })
        );
      }
      return result;
    } catch (error) {
      // A caller-initiated abort is not a provider failure and must never be
      // retried — the work has been abandoned.
      if (signal?.aborted) {
        throw new AiError("CANCELLED", error);
      }

      const aiError = timeout.aborted
        ? new AiError("TIMEOUT", error)
        : classifyAiError(error);
      lastError = aiError;

      if (!aiError.retryable || attempt === MAX_ATTEMPTS) {
        logAiError(context, aiError, {
          requestId,
          provider: meta.provider,
          model: meta.model,
          attempts: attempt,
          latencyMs: Date.now() - started,
        });
        throw aiError;
      }

      // Never sleep past the deadline — a backoff that outlives the budget
      // just delays the inevitable failure past the platform timeout.
      const delay = Math.min(
        BASE_DELAY_MS * 2 ** (attempt - 1),
        Math.max(0, deadline - Date.now())
      );
      if (delay <= 0) {
        logAiError(context, aiError, {
          requestId, provider: meta.provider, model: meta.model,
          attempts: attempt, latencyMs: Date.now() - started,
        });
        throw aiError;
      }
      console.warn(
        JSON.stringify({
          event: "ai_retry",
          context,
          requestId,
          provider: meta.provider ?? null,
          model: meta.model ?? null,
          code: aiError.code,
          status: aiError.status,
          attempt,
          nextDelayMs: delay,
          elapsedMs: Date.now() - started,
        })
      );
      await sleep(delay, signal);
    }
  }

  throw lastError ?? new AiError("UNKNOWN");
}
