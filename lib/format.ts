/**
 * Presentation formatters.
 *
 * Database enums and ISO timestamps must never reach a user's screen raw.
 * Every label a user reads goes through this module, so wording stays
 * consistent across the dashboard, matter workspace, and audit trail.
 *
 * No `server-only` import: these are pure functions used by both server and
 * client components.
 */

export type MatterStatus = "OPEN" | "PENDING" | "CLOSED" | "ARCHIVED";
export type DocumentStatus = "UPLOADED" | "PROCESSING" | "READY" | "FAILED";
export type ReviewStatus = "PENDING_REVIEW" | "APPROVED" | "REJECTED";
export type InteractionType = "RESEARCH" | "SUMMARIZE" | "DRAFT" | "EXTRACT";
export type Role = "ADMIN" | "ATTORNEY" | "PARALEGAL" | "STAFF";

/** Which semantic token a status maps to. Drives StatusBadge colouring. */
export type StatusTone = "grounded" | "pending" | "rejected" | "neutral";

export const matterStatusLabel: Record<MatterStatus, string> = {
  OPEN: "Open",
  PENDING: "Pending",
  CLOSED: "Closed",
  ARCHIVED: "Archived",
};

export const matterStatusTone: Record<MatterStatus, StatusTone> = {
  OPEN: "grounded",
  PENDING: "pending",
  CLOSED: "neutral",
  ARCHIVED: "neutral",
};

export const documentStatusLabel: Record<DocumentStatus, string> = {
  UPLOADED: "Queued",
  PROCESSING: "Processing",
  READY: "Ready",
  FAILED: "Failed",
};

export const documentStatusTone: Record<DocumentStatus, StatusTone> = {
  UPLOADED: "neutral",
  PROCESSING: "pending",
  READY: "grounded",
  FAILED: "rejected",
};

/**
 * Plain-language explanation of what each ingestion state means for the
 * user — specifically, whether the document can ground an answer yet.
 */
export const documentStatusHint: Record<DocumentStatus, string> = {
  UPLOADED: "Waiting to be processed. Not yet searchable.",
  PROCESSING: "Extracting and indexing text. Not yet searchable.",
  READY: "Indexed and available to ground answers.",
  FAILED: "Could not be processed. This document cannot ground answers.",
};

export const reviewStatusLabel: Record<ReviewStatus, string> = {
  PENDING_REVIEW: "Awaiting review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
};

export const reviewStatusTone: Record<ReviewStatus, StatusTone> = {
  PENDING_REVIEW: "pending",
  APPROVED: "grounded",
  REJECTED: "rejected",
};

export const interactionTypeLabel: Record<InteractionType, string> = {
  RESEARCH: "Research",
  SUMMARIZE: "Summary",
  DRAFT: "Draft",
  EXTRACT: "Extraction",
};

export type KnowledgeMode = "DOCUMENT_ONLY" | "DOCUMENT_PLUS_AI";

export const knowledgeModeLabel: Record<KnowledgeMode, string> = {
  DOCUMENT_ONLY: "Documents only",
  DOCUMENT_PLUS_AI: "Documents + AI context",
};

/** What each mode actually permits — shown on the composer selector. */
export const knowledgeModeDescription: Record<KnowledgeMode, string> = {
  DOCUMENT_ONLY:
    "Every claim comes from this project's documents, with a citation.",
  DOCUMENT_PLUS_AI:
    "Document-grounded answer first, plus a clearly-labelled section of general background from the model. Citations never apply to that section.",
};

/**
 * The Role enum values are database identifiers and stay as-is; these are the
 * domain-neutral labels users actually see. CaseOS analyses any document
 * collection, so roles are described by what someone does in a workspace
 * rather than by profession.
 */
export const roleLabel: Record<Role, string> = {
  ADMIN: "Administrator",
  ATTORNEY: "Lead analyst",
  PARALEGAL: "Analyst",
  STAFF: "Contributor",
};

export type ProjectRole = "OWNER" | "EDITOR" | "VIEWER";

/**
 * Per-project permission. Distinct from `roleLabel` above, which is the
 * workspace-wide role — a workspace administrator can still be a viewer on
 * someone else's project.
 */
export const projectRoleLabel: Record<ProjectRole, string> = {
  OWNER: "Owner",
  EDITOR: "Editor",
  VIEWER: "Viewer",
};

export const projectRoleDescription: Record<ProjectRole, string> = {
  OWNER: "Full control, including sharing and deletion",
  EDITOR: "Can upload documents and ask questions",
  VIEWER: "Read-only access",
};

/** Audit actions rendered as past-tense sentences rather than constants. */
const auditActionLabel: Record<string, string> = {
  AI_QUESTION_ASKED: "asked a question",
  AI_ANSWER_APPROVED: "approved an AI answer",
  AI_ANSWER_REJECTED: "rejected an AI answer",
  DOCUMENT_UPLOADED: "uploaded a document",
  DOCUMENT_INGESTED: "finished ingesting a document",
  DOCUMENT_INGEST_FAILED: "hit an ingestion failure",
  DOCUMENT_INGEST_TIMED_OUT: "had a stalled upload recovered",
  DOCUMENT_INGEST_RETRIED: "retried a document upload",
  DOCUMENT_RENAMED: "renamed a document",
  DOCUMENT_MOVED_IN: "moved a document into this project",
  DOCUMENT_MOVED_OUT: "moved a document to another project",
  DOCUMENT_DELETED: "deleted a document",
  MATTER_CREATED: "created the project",
  FIRM_CREATED: "created the workspace",
  FIRM_SEEDED: "seeded demo data",
};

/**
 * Falls back to de-constantising unknown actions (NEW_THING -> "new thing")
 * so a newly added audit action degrades gracefully instead of shouting.
 */
export function formatAuditAction(action: string): string {
  return auditActionLabel[action] ?? action.toLowerCase().replace(/_/g, " ");
}

const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** "Mar 4, 2026" */
export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

/** "Mar 4, 2026, 2:31 PM" — for audit entries, where the time is evidence. */
export function formatDateTime(date: Date): string {
  return dateTimeFormatter.format(date);
}

/** Full precision for tooltips and `title` attributes on relative times. */
export function formatPreciseDateTime(date: Date): string {
  return date.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "long",
  });
}

const relativeFormatter = new Intl.RelativeTimeFormat("en-US", {
  numeric: "auto",
});

const RELATIVE_UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 60 * 60 * 1000],
  ["month", 30 * 24 * 60 * 60 * 1000],
  ["week", 7 * 24 * 60 * 60 * 1000],
  ["day", 24 * 60 * 60 * 1000],
  ["hour", 60 * 60 * 1000],
  ["minute", 60 * 1000],
];

/**
 * "3 hours ago". Anything older than ~30 days falls back to an absolute date —
 * "11 months ago" is useless on a record where the exact date matters.
 */
export function formatRelativeTime(date: Date, now: Date = new Date()): string {
  const diff = date.getTime() - now.getTime();
  const abs = Math.abs(diff);

  if (abs < 45 * 1000) return "just now";
  if (abs > 30 * 24 * 60 * 60 * 1000) return formatDate(date);

  for (const [unit, ms] of RELATIVE_UNITS) {
    if (abs >= ms) {
      return relativeFormatter.format(Math.round(diff / ms), unit);
    }
  }
  return "just now";
}

/** "1.4 MB" — binary units, one decimal below 10 for compactness. */
export function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );
  const value = bytes / Math.pow(1024, exponent);
  const decimals = exponent === 0 || value >= 10 ? 0 : 1;
  return `${value.toFixed(decimals)} ${units[exponent]}`;
}

/** Pluralise without the "1 documents" bug. */
export function pluralize(count: number, singular: string, plural?: string) {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/** "3 documents" / "1 document" */
export function countLabel(count: number, singular: string, plural?: string) {
  return `${count} ${pluralize(count, singular, plural)}`;
}

/** Initials for avatar fallbacks: "Jordan Alvarez" -> "JA". */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
