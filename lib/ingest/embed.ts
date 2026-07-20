import "server-only";

import {
  pipeline,
  type FeatureExtractionPipeline,
} from "@huggingface/transformers";

// Local, zero-cost embeddings (no API key). The model (~34 MB) is downloaded
// from the Hugging Face Hub on first use and cached on disk. To switch to a
// hosted provider later, replace embedTexts and re-ingest all documents —
// chunk vectors and query vectors must always come from the same model.
const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "Xenova/bge-small-en-v1.5";

const globalForEmbedder = globalThis as unknown as {
  embedder?: Promise<FeatureExtractionPipeline>;
};

function getEmbedder(): Promise<FeatureExtractionPipeline> {
  globalForEmbedder.embedder ??= pipeline("feature-extraction", EMBEDDING_MODEL, {
    dtype: "fp32",
  });
  return globalForEmbedder.embedder;
}

const BATCH_SIZE = 16;

/** Embeds texts in batches. Returns normalized vectors in input order. */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  const embedder = await getEmbedder();
  const vectors: number[][] = [];
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const output = await embedder(batch, { pooling: "mean", normalize: true });
    const [rows, dims] = output.dims;
    const data = output.data as Float32Array;
    for (let row = 0; row < rows; row++) {
      vectors.push(Array.from(data.slice(row * dims, (row + 1) * dims)));
    }
  }
  return vectors;
}

/** Embeds a single query string (used by matter-scoped retrieval in Phase 3). */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embedTexts([text]);
  return vector;
}
