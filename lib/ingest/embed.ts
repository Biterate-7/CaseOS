import "server-only";

import { GoogleGenAI } from "@google/genai";

import { lazy } from "@/lib/lazy";

/**
 * Hosted embeddings via the Gemini API.
 *
 * This replaced a local transformers.js / onnxruntime-node embedder. That
 * approach was zero-cost and key-free, but `onnxruntime-node` +
 * `@huggingface/transformers` weigh ~349 MB against Vercel's 250 MB function
 * limit, the native ONNX binary has to match the Lambda platform, and
 * transformers.js caches its model to disk — which is read-only on Vercel
 * outside /tmp. Serverless left no way to make it work.
 *
 * Chunk vectors and query vectors must always come from the same model and
 * dimensionality. Changing EMBEDDING_MODEL or EMBEDDING_DIMENSIONS invalidates
 * every stored vector — run `npm run db:reset-embeddings` and re-ingest, or
 * retrieval will fail on dimension mismatch.
 */

const EMBEDDING_MODEL = process.env.EMBEDDING_MODEL ?? "gemini-embedding-001";

/**
 * 768 is Google's recommended size below the 3072 native width: materially
 * cheaper to store and compare, with negligible retrieval loss.
 */
const EMBEDDING_DIMENSIONS = Number(process.env.EMBEDDING_DIMENSIONS ?? 768);

/** Texts per request. The API accepts more; this keeps payloads modest. */
const BATCH_SIZE = 32;

const globalForEmbedder = globalThis as unknown as { embedClient?: GoogleGenAI };

function createEmbedClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY is not set — embeddings run through the Gemini API. Copy .env.example to .env and fill it in."
    );
  }
  return new GoogleGenAI({ apiKey });
}

const client: GoogleGenAI = lazy(() => {
  globalForEmbedder.embedClient ??= createEmbedClient();
  return globalForEmbedder.embedClient;
});

/**
 * Gemini truncates rather than re-projects when outputDimensionality is below
 * the model's native width, so sub-3072 vectors come back un-normalized.
 * Cosine distance in pgvector assumes unit length, so normalize here.
 * Idempotent for vectors that are already unit length.
 */
function normalize(vector: number[]): number[] {
  let sumSquares = 0;
  for (const value of vector) sumSquares += value * value;
  const magnitude = Math.sqrt(sumSquares);
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

async function embed(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY"
): Promise<number[][]> {
  const vectors: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);

    const response = await client.models.embedContent({
      model: EMBEDDING_MODEL,
      contents: batch,
      config: { taskType, outputDimensionality: EMBEDDING_DIMENSIONS },
    });

    const embeddings = response.embeddings;
    if (!embeddings || embeddings.length !== batch.length) {
      throw new Error(
        `Embedding API returned ${embeddings?.length ?? 0} vectors for ${batch.length} inputs.`
      );
    }

    for (const embedding of embeddings) {
      if (!embedding.values?.length) {
        throw new Error("Embedding API returned an empty vector.");
      }
      vectors.push(normalize(embedding.values));
    }
  }

  return vectors;
}

/**
 * Embeds document passages. Uses RETRIEVAL_DOCUMENT so the vectors sit in the
 * space Gemini optimises for being *searched against*.
 */
export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];
  return embed(texts, "RETRIEVAL_DOCUMENT");
}

/**
 * Embeds a search query. RETRIEVAL_QUERY is the asymmetric counterpart to
 * RETRIEVAL_DOCUMENT — using the wrong one on either side measurably degrades
 * retrieval, so these must stay paired.
 */
export async function embedQuery(text: string): Promise<number[]> {
  const [vector] = await embed([text], "RETRIEVAL_QUERY");
  return vector;
}

/** Dimensionality of vectors this module produces. Used by diagnostics. */
export const embeddingDimensions = EMBEDDING_DIMENSIONS;
export const embeddingModel = EMBEDDING_MODEL;
