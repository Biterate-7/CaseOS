import { NextResponse } from "next/server";

import { reconcileStuckDocuments } from "@/lib/ingest/reconcile";

/**
 * Backstop for stuck-document recovery.
 *
 * The loaders already reconcile a workspace before anyone views it, so a user
 * never *sees* a permanently-stuck document. This handles the other case: a
 * document in a workspace nobody opens. It sweeps every workspace on a
 * schedule (see vercel.json) so recovery does not depend on someone looking.
 *
 * Auth: Vercel Cron attaches `Authorization: Bearer $CRON_SECRET` when
 * CRON_SECRET is set. The route rejects anything else, so it cannot be
 * triggered by an anonymous request. If CRON_SECRET is unset the route refuses
 * outright rather than running unauthenticated — failing closed.
 */

export const dynamic = "force-dynamic";
// Sweeping every workspace can take longer than the default budget.
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "CRON_SECRET is not configured." },
      { status: 503 }
    );
  }

  const authorized =
    request.headers.get("authorization") === `Bearer ${secret}`;
  if (!authorized) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const reconciled = await reconcileStuckDocuments("all");
    return NextResponse.json({ ok: true, reconciled });
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "cron_reconcile_failed",
        message:
          error instanceof Error ? error.message.slice(0, 400) : String(error),
      })
    );
    // The message is not returned — a cron response can end up in logs the
    // caller does not control.
    return NextResponse.json(
      { ok: false, error: "Reconciliation failed." },
      { status: 500 }
    );
  }
}
