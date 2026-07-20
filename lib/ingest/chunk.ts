import "server-only";

import type { ExtractedPage } from "./extract";

export type Chunk = {
  chunkIndex: number;
  content: string;
  pageNumber: number;
};

// ~500 tokens at the usual ~4 chars/token, with overlap so a passage split
// across a boundary still appears whole in at least one chunk.
const CHUNK_SIZE_CHARS = 2000;
const CHUNK_OVERLAP_CHARS = 200;

/**
 * Splits extracted pages into overlapping chunks. Chunks never span pages,
 * so every chunk carries an unambiguous page number for citations.
 */
export function chunkPages(pages: ExtractedPage[]): Chunk[] {
  const chunks: Chunk[] = [];
  let chunkIndex = 0;

  for (const page of pages) {
    const text = page.text.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
    if (!text) continue;

    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + CHUNK_SIZE_CHARS, text.length);
      // Prefer to break at a sentence or paragraph boundary near the end.
      let sliceEnd = end;
      if (end < text.length) {
        const window = text.slice(start, end);
        const lastBreak = Math.max(
          window.lastIndexOf("\n\n"),
          window.lastIndexOf(". "),
          window.lastIndexOf(".\n")
        );
        if (lastBreak > CHUNK_SIZE_CHARS * 0.5) sliceEnd = start + lastBreak + 1;
      }

      const content = text.slice(start, sliceEnd).trim();
      if (content) {
        chunks.push({ chunkIndex: chunkIndex++, content, pageNumber: page.pageNumber });
      }
      if (sliceEnd >= text.length) break;
      start = Math.max(sliceEnd - CHUNK_OVERLAP_CHARS, start + 1);
    }
  }

  return chunks;
}
