/**
 * AI error handling.
 *
 * The property that matters most: no provider text ever reaches userMessage.
 * The 503 that prompted this work arrived as a raw JSON body in Error.message
 * and was forwarded verbatim to the browser.
 */
import "dotenv/config";
import { AiError, classifyAiError, withAiRetry } from "../lib/ai/errors";

let failed = 0;
const check = (n: string, ok: boolean, d = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

// The exact shape the Gemini SDK throws for an overloaded model.
const GEMINI_503 = Object.assign(
  new Error(
    '{"error":{"code":503,"message":"The model is overloaded. Please try again later.","status":"UNAVAILABLE"}}'
  ),
  { status: 503 }
);

async function main() {
  // AbortSignal.timeout() uses an UNREF'd timer by design — it does not hold
  // the event loop open. In a bare script with nothing else pending, Node
  // exits (cleanly, code 0) before the timeout ever fires, so the timeout and
  // cancellation assertions below silently never ran. A ref'd keepalive holds
  // the loop until the suite finishes. Not needed in production, where the
  // in-flight HTTP request keeps the loop alive.
  const keepAlive = setInterval(() => {}, 1000);
  try {
    await run();
  } finally {
    clearInterval(keepAlive);
  }
}

async function run() {
  // --- classification ------------------------------------------------------
  const cases: [string, unknown, string][] = [
    ["Gemini 503 JSON body", GEMINI_503, "OVERLOADED"],
    ["nested {error:{code:503}}", { error: { code: 503 } }, "OVERLOADED"],
    ["429", Object.assign(new Error("quota"), { status: 429 }), "RATE_LIMITED"],
    ["401", Object.assign(new Error("bad key"), { status: 401 }), "AUTH"],
    ["400", Object.assign(new Error("malformed"), { status: 400 }), "BAD_REQUEST"],
    ["500", Object.assign(new Error("boom"), { status: 500 }), "SERVER"],
    ["AbortError", Object.assign(new Error("The operation was aborted"), { name: "AbortError" }), "TIMEOUT"],
    ["fetch failed", new Error("fetch failed"), "NETWORK"],
    ["ECONNRESET", new Error("read ECONNRESET"), "NETWORK"],
    ["unknown", new Error("something odd"), "UNKNOWN"],
  ];
  for (const [name, input, expected] of cases) {
    const e = classifyAiError(input);
    check(`classify ${name} -> ${expected}`, e.code === expected, e.code);
  }

  // --- the headline requirement -------------------------------------------
  const leaked = classifyAiError(GEMINI_503);
  check("503 user message is the required copy",
    leaked.userMessage === "The AI service is currently experiencing high demand. Please try again in a few moments.");
  check("user message contains no JSON", !/[{}"]|code|status/i.test(leaked.userMessage));
  check("user message contains no status code", !/503/.test(leaked.userMessage));
  check("raw body retained server-side only",
    (leaked.cause as Error)?.message.includes("overloaded"));

  // --- retry policy --------------------------------------------------------
  check("503 retryable", classifyAiError(GEMINI_503).retryable);
  check("timeout retryable", classifyAiError(new Error("timed out")).retryable);
  check("400 NOT retryable", !classifyAiError(Object.assign(new Error("x"), { status: 400 })).retryable);
  check("401 NOT retryable", !classifyAiError(Object.assign(new Error("x"), { status: 401 })).retryable);
  check("429 NOT retried automatically",
    !classifyAiError(Object.assign(new Error("x"), { status: 429 })).retryable);

  // --- backoff behaviour ---------------------------------------------------
  let attempts = 0;
  const started = Date.now();
  try {
    await withAiRetry("test", async () => { attempts++; throw GEMINI_503; });
  } catch (e) {
    check("throws AiError after exhausting retries", e instanceof AiError);
  }
  const elapsed = Date.now() - started;
  check("attempted exactly 3 times", attempts === 3, `${attempts}`);
  check("waited ~3s total (1s + 2s)", elapsed >= 2900 && elapsed < 5000, `${elapsed}ms`);

  let noRetryAttempts = 0;
  try {
    await withAiRetry("test", async () => {
      noRetryAttempts++;
      throw Object.assign(new Error("bad"), { status: 400 });
    });
  } catch { /* expected */ }
  check("400 attempted once, not retried", noRetryAttempts === 1, `${noRetryAttempts}`);

  let okAttempts = 0;
  const value = await withAiRetry("test", async () => {
    okAttempts++;
    if (okAttempts < 2) throw GEMINI_503;
    return "recovered";
  });
  check("recovers when a retry succeeds", value === "recovered" && okAttempts === 2);

  // --- timeout -------------------------------------------------------------
  let timedOut = "";
  const tStart = Date.now();
  try {
    await withAiRetry(
      "test",
      (signal) =>
        new Promise((_, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
        }),
      { timeoutMs: 100, budgetMs: 2000 }
    );
  } catch (e) { timedOut = (e as AiError).code; }
  check("per-attempt timeout yields TIMEOUT", timedOut === "TIMEOUT", timedOut);
  check("timeout sequence stays inside budget", Date.now() - tStart <= 2200, `${Date.now() - tStart}ms`);

  // --- overall budget is a hard ceiling ------------------------------------
  const bStart = Date.now();
  try {
    await withAiRetry("test", async () => { throw GEMINI_503; }, { budgetMs: 1500 });
  } catch { /* expected */ }
  const bElapsed = Date.now() - bStart;
  check("budget caps the whole sequence", bElapsed <= 1700, `${bElapsed}ms`);

  // --- cancellation --------------------------------------------------------
  const controller = new AbortController();
  let cancelAttempts = 0;
  let cancelCode = "";
  try {
    await withAiRetry("test", async () => {
      cancelAttempts++;
      controller.abort();
      throw GEMINI_503;
    }, { signal: controller.signal });
  } catch (e) { cancelCode = (e as AiError).code; }
  check("caller abort yields CANCELLED", cancelCode === "CANCELLED", cancelCode);
  check("cancelled request not retried", cancelAttempts === 1, String(cancelAttempts));
  check("CANCELLED not retryable", !new AiError("CANCELLED").retryable);

  // --- abort during backoff ------------------------------------------------
  const midController = new AbortController();
  let midAttempts = 0;
  let midCode = "";
  setTimeout(() => midController.abort(), 200);
  try {
    await withAiRetry("test", async () => { midAttempts++; throw GEMINI_503; },
      { signal: midController.signal });
  } catch (e) { midCode = (e as AiError).code; }
  check("abort during backoff stops retrying", midCode === "CANCELLED", midCode);
  check("no further attempts after abort", midAttempts === 1, String(midAttempts));

  // --- fresh signal per attempt --------------------------------------------
  const seen = new Set<AbortSignal>();
  try {
    await withAiRetry("test", async (signal) => { seen.add(signal); throw GEMINI_503; },
      { timeoutMs: 50, budgetMs: 4000 });
  } catch { /* expected */ }
  check("each attempt gets a fresh signal", seen.size === 3, String(seen.size));

  // --- log hygiene ---------------------------------------------------------
  const logs: string[] = [];
  const realError = console.error, realWarn = console.warn;
  console.error = (m: unknown) => { logs.push(String(m)); };
  console.warn = (m: unknown) => { logs.push(String(m)); };
  try {
    await withAiRetry("hygiene", async () => { throw GEMINI_503; },
      { meta: { provider: "gemini", model: "gemini-flash-latest" } });
  } catch { /* expected */ }
  console.error = realError; console.warn = realWarn;

  const joined = logs.join("\n");
  const errLine = JSON.parse(logs.find((l) => l.includes('"ai_error"'))!);
  check("log carries requestId", typeof errLine.requestId === "string" && errLine.requestId.length > 0);
  check("log carries provider", errLine.provider === "gemini");
  check("log carries model", errLine.model === "gemini-flash-latest");
  check("log carries status", errLine.status === 503);
  check("log carries attempt count", errLine.attempts === 3, String(errLine.attempts));
  check("log carries latency", typeof errLine.latencyMs === "number");
  check("no API key in any log line", !/AIza|sk-[A-Za-z0-9]|Bearer /.test(joined));
  check("requestId correlates lines", logs.filter((l) => l.includes(errLine.requestId)).length >= 2);

  console.log(`\n${failed === 0 ? "ALL PASS" : failed + " FAILURE(S)"}`);
  process.exitCode = failed === 0 ? 0 : 1;
}
main().catch((e) => { console.error("ERROR:", e?.message ?? e); process.exitCode = 1; });
