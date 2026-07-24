import "server-only";

import { randomUUID } from "node:crypto";

/**
 * Structured server-side error logging.
 *
 * One JSON line per failure carrying the identifiers needed to trace it —
 * request, user, workspace (firm), matter, document — plus a bounded stack and
 * a timestamp. This is the counterpart to lib/ai/errors.ts (which handles AI
 * provider failures specifically); use this for everything else that can throw
 * during a request: data loading, server actions, background maintenance.
 *
 * Deliberately never logs the raw error object — that can carry a connection
 * string or an API key in a request field. Only name + message + stack cross
 * into the log, all truncated.
 */

export type LogContext = {
  /** Correlates every line for one logical request; auto-generated if absent. */
  requestId?: string;
  userId?: string | null;
  /** The workspace id (Firm.id in the data model). */
  firmId?: string | null;
  matterId?: string | null;
  documentId?: string | null;
};

export function newRequestId(): string {
  return randomUUID();
}

/**
 * Logs a structured error and returns the requestId, so a caller can surface it
 * to the user as a support reference that ties the screen to this log line.
 */
export function logError(event: string, ctx: LogContext, error: unknown): string {
  const requestId = ctx.requestId ?? newRequestId();
  console.error(
    JSON.stringify({
      event,
      requestId,
      userId: ctx.userId ?? null,
      firmId: ctx.firmId ?? null,
      matterId: ctx.matterId ?? null,
      documentId: ctx.documentId ?? null,
      error: error instanceof Error ? error.name : typeof error,
      message:
        error instanceof Error
          ? error.message.slice(0, 500)
          : String(error).slice(0, 500),
      stack: error instanceof Error ? (error.stack?.slice(0, 2000) ?? null) : null,
      timestamp: new Date().toISOString(),
    })
  );
  return requestId;
}
