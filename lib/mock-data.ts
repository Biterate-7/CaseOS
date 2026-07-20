export type MockMatter = {
  id: string;
  title: string;
  clientName: string;
  practiceArea: string;
  status: "OPEN" | "PENDING" | "CLOSED";
  documentCount: number;
  updatedAt: string;
};

export type MockDocument = {
  id: string;
  title: string;
  fileName: string;
  status: "READY" | "PROCESSING" | "UPLOADED";
  pages: number;
  uploadedAt: string;
};

export type MockAuditEntry = {
  id: string;
  actor: string;
  action: string;
  detail: string;
  at: string;
};

export const mockMatters: MockMatter[] = [
  {
    id: "mat_01",
    title: "Hendricks v. Meridian Logistics",
    clientName: "Sarah Hendricks",
    practiceArea: "Employment",
    status: "OPEN",
    documentCount: 14,
    updatedAt: "2026-07-19",
  },
  {
    id: "mat_02",
    title: "Delta Ridge HOA — Easement Dispute",
    clientName: "Delta Ridge HOA",
    practiceArea: "Real Estate",
    status: "OPEN",
    documentCount: 8,
    updatedAt: "2026-07-18",
  },
  {
    id: "mat_03",
    title: "Kovac Manufacturing — Asset Purchase",
    clientName: "Kovac Manufacturing LLC",
    practiceArea: "Corporate",
    status: "PENDING",
    documentCount: 23,
    updatedAt: "2026-07-15",
  },
  {
    id: "mat_04",
    title: "Estate of R. Whitfield",
    clientName: "Whitfield Family",
    practiceArea: "Estates & Trusts",
    status: "CLOSED",
    documentCount: 11,
    updatedAt: "2026-06-30",
  },
];

export const mockDocuments: MockDocument[] = [
  {
    id: "doc_01",
    title: "Employment Agreement (2022)",
    fileName: "hendricks-employment-agreement-2022.pdf",
    status: "READY",
    pages: 18,
    uploadedAt: "2026-07-12",
  },
  {
    id: "doc_02",
    title: "Termination Letter",
    fileName: "termination-letter-2026-03-14.pdf",
    status: "READY",
    pages: 2,
    uploadedAt: "2026-07-12",
  },
  {
    id: "doc_03",
    title: "HR Investigation File",
    fileName: "hr-investigation-file.pdf",
    status: "PROCESSING",
    pages: 64,
    uploadedAt: "2026-07-19",
  },
];

export const mockAuditTrail: MockAuditEntry[] = [
  {
    id: "aud_01",
    actor: "J. Alvarez",
    action: "AI_RESEARCH",
    detail: "Asked: non-compete enforceability — answer cited 3 passages",
    at: "2026-07-19 14:32",
  },
  {
    id: "aud_02",
    actor: "J. Alvarez",
    action: "AI_DRAFT_APPROVED",
    detail: "Approved demand letter draft after review",
    at: "2026-07-19 11:05",
  },
  {
    id: "aud_03",
    actor: "M. Chen",
    action: "DOCUMENT_UPLOADED",
    detail: "HR Investigation File (64 pages) — ingestion started",
    at: "2026-07-19 09:41",
  },
];
