import "server-only";

import { extractText, getDocumentProxy } from "unpdf";

export type ExtractedPage = {
  pageNumber: number;
  text: string;
};

/**
 * Extracts text from an uploaded file, preserving page numbers where the
 * format has them — citations must be able to point at a specific page.
 */
export async function extractPages(
  file: Buffer,
  mimeType: string
): Promise<ExtractedPage[]> {
  if (mimeType === "application/pdf") {
    const pdf = await getDocumentProxy(new Uint8Array(file));
    const { text } = await extractText(pdf, { mergePages: false });
    return text.map((pageText, i) => ({ pageNumber: i + 1, text: pageText.trim() }));
  }

  if (mimeType.startsWith("text/")) {
    return [{ pageNumber: 1, text: file.toString("utf-8").trim() }];
  }

  throw new Error(`Unsupported file type: ${mimeType}. Upload a PDF or plain-text file.`);
}
