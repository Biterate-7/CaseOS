/**
 * Shared ingestion deadline.
 *
 * The property under test: one deadline for the whole document, checked before
 * each batch, so total time is bounded no matter how many batches there are —
 * and no batch is started once the budget is spent.
 */
import "dotenv/config";
import { withAiRetry, AiError } from "../lib/ai/errors";

let failed = 0;
const check = (n: string, ok: boolean, d = "") => {
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}  ${n}${d ? ` — ${d}` : ""}`);
};

/**
 * Mirrors embed()'s deadline logic exactly, with a fake per-batch call, so the
 * timing is deterministic and needs no Gemini key.
 */
class BudgetExceeded extends Error {
  constructor(readonly done: number, readonly total: number) { super("budget"); }
}
// Mutable so the caller can read how many batches finished even when the run
// throws partway — mirrors how the pipeline knows the partial count.
const progress = { done: 0 };

async function fakeEmbed(
  batches: number,
  perBatchMs: number,
  deadline: number
): Promise<number> {
  progress.done = 0;
  for (let i = 0; i < batches; i++) {
    if (Date.now() >= deadline) throw new BudgetExceeded(i, batches);
    try {
      // Each batch shares the deadline rather than getting its own budget.
      await withAiRetry("embed", async (signal) => {
        await new Promise<void>((resolve, reject) => {
          const t = setTimeout(resolve, perBatchMs);
          signal.addEventListener("abort", () => { clearTimeout(t); reject(new Error("aborted")); }, { once: true });
        });
      }, { deadline });
    } catch (e) {
      // Deadline-capped abort late in the run == budget exhausted, mirroring
      // the relabelling embed() does.
      if (Date.now() >= deadline) throw new BudgetExceeded(i, batches);
      throw e;
    }
    progress.done++;
  }
  return progress.done;
}

async function main() {
  const keepAlive = setInterval(() => {}, 1000);
  try {
    // 100 batches x 100ms would be 10s if each ran; a 1s shared deadline must
    // stop it early.
    const budget = 1000;
    const start = Date.now();
    let code = "";
    try {
      await fakeEmbed(100, 100, Date.now() + budget);
    } catch (e) {
      code = e instanceof BudgetExceeded ? "BUDGET" : (e as AiError).code;
    }
    const done = progress.done;
    const elapsed = Date.now() - start;

    check("stops before all batches finish", done < 100, `${done} done`);
    check("some batches DID complete", done > 0, `${done} done`);
    check("total time bounded by budget", elapsed <= budget + 300, `${elapsed}ms vs ${budget}ms`);
    check("fails with a budget error, not a provider error", code === "BUDGET", code);

    // A tiny document finishes well within budget and is NOT truncated.
    const smallStart = Date.now();
    const smallDone = await fakeEmbed(3, 50, Date.now() + 5000);
    check("small doc completes fully", smallDone === 3, `${smallDone}`);
    check("small doc finishes fast", Date.now() - smallStart < 1000);

    // Deadline already passed → not a single batch starts.
    let zeroDone = -1, zeroCode = "";
    try { zeroDone = await fakeEmbed(10, 100, Date.now() - 1); }
    catch (e) { zeroCode = e instanceof BudgetExceeded ? "BUDGET" : "?"; zeroDone = (e as BudgetExceeded).done; }
    check("expired deadline starts zero batches", zeroDone === 0, `${zeroDone}`);
    check("expired deadline reports budget error", zeroCode === "BUDGET", zeroCode);
  } finally {
    clearInterval(keepAlive);
  }

  console.log(`\n${failed === 0 ? "ALL PASS" : failed + " FAILURE(S)"}`);
  process.exitCode = failed === 0 ? 0 : 1;
}
main().catch((e) => { console.error("ERROR:", e?.message ?? e); process.exitCode = 1; });
