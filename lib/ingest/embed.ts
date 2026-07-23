import "server-only";

import { GoogleGenAI } from "@google/genai";

import { withAiRetry } from "@/lib/ai/errors";
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

/**
 * Thrown when a document's shared ingestion budget runs out before every
 * batch is embedded. Distinct from a per-request AiError so the pipeline can
 * mark the document FAILED with an accurate reason rather than "the AI service
 * is unavailable", which it was not — we simply ran out of execution time.
 */
export class IngestBudgetExceededError extends Error {
  readonly embeddedBatches: number;
  readonly totalBatches: number;
  constructor(embeddedBatches: number, totalBatches: number) {
    super(
      `Ingestion exceeded its execution budget after ${embeddedBatches} of ${totalBatches} batches.`
    );
    this.name = "IngestBudgetExceededError";
    this.embeddedBatches = embeddedBatches;
    this.totalBatches = totalBatches;
  }
}

async function embed(
  texts: string[],
  taskType: "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY",
  deadline?: number
): Promise<number[][]> {
  const vectors: number[][] = [];
  const totalBatches = Math.ceil(texts.length / BATCH_SIZE);

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batchIndex = i / BATCH_SIZE;

    // The whole point of the shared deadline: check BEFORE spending on the
    // next batch. Once no time remains we stop immediately rather than start
    // work that cannot finish, so the total can never exceed the budget.
    if (deadline != null && Date.now() >= deadline) {
      throw new IngestBudgetExceededError(batchIndex, totalBatches);
    }

    const batch = texts.slice(i, i + BATCH_SIZE);

    // Embeddings run on the same Gemini backend as generation, so they hit
    // the same 503s. Retried, but bounded by the SHARED deadline — the retry
    // sequence for this batch may not run past the document's overall
    // ceiling, so a blip late in a long document fails fast instead of each
    // batch getting a fresh 45s.
    let response;
    try {
      response = await withAiRetry(
        "embed",
        (signal) =>
          client.models.embedContent({
            model: EMBEDDING_MODEL,
            contents: batch,
            config: {
              taskType,
              outputDimensionality: EMBEDDING_DIMENSIONS,
              // Threaded through so the timeout actually cancels the request
              // rather than abandoning a socket that keeps running.
              abortSignal: signal,
            },
          }),
        { meta: { provider: "gemini", model: EMBEDDING_MODEL }, deadline }
      );
    } catch (error) {
      // If the shared deadline has passed, this batch was cut short by the
      // budget, not by an unhealthy provider — the deadline-capped per-attempt
      // timeout aborts an in-flight request that would run past the ceiling.
      // Relabel it so the document fails with an accurate reason.
      if (deadline != null && Date.now() >= deadline) {
        throw new IngestBudgetExceededError(batchIndex, totalBatches);
      }
      throw error;
    }

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
export async function embedTexts(
  texts: string[],
  options: { deadline?: number } = {}
): Promise<number[][]> {
  if (texts.length === 0) return [];
  return embed(texts, "RETRIEVAL_DOCUMENT", options.deadline);
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
