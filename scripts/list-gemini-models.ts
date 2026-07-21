/** Lists Gemini models available to the configured GEMINI_API_KEY. */
import "dotenv/config";

async function main() {
  const key = process.env.GEMINI_API_KEY;
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
  );
  if (!res.ok) {
    console.error(`FAILED: ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }
  const body = (await res.json()) as {
    models: { name: string; supportedGenerationMethods?: string[] }[];
  };
  for (const m of body.models) {
    if (m.supportedGenerationMethods?.includes("generateContent")) {
      console.log(m.name.replace("models/", ""));
    }
  }
}

main();
