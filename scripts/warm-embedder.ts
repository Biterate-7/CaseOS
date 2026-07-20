/** Downloads/caches the local embedding model and runs a smoke embedding. */
import { pipeline } from "@huggingface/transformers";

async function main() {
  const model = process.env.EMBEDDING_MODEL ?? "Xenova/bge-small-en-v1.5";
  console.log(`Loading ${model} (downloads on first run)...`);
  const embedder = await pipeline("feature-extraction", model, { dtype: "fp32" });
  const out = await embedder(["The settlement payment is $85,000."], {
    pooling: "mean",
    normalize: true,
  });
  console.log(`OK — embedded 1 text, dims: ${out.dims.join("x")}`);
  process.exit(0);
}

main().catch((e) => {
  console.error("FAILED:", e.message ?? e);
  process.exit(1);
});
