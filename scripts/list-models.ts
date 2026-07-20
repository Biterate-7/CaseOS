/** Lists chat models available to the configured xAI API key. */
import "dotenv/config";

async function main() {
  const res = await fetch("https://api.x.ai/v1/models", {
    headers: { Authorization: `Bearer ${process.env.XAI_API_KEY}` },
  });
  if (!res.ok) {
    console.error(`FAILED: ${res.status} ${res.statusText}`);
    console.error(await res.text());
    process.exit(1);
  }
  const body = (await res.json()) as { data: { id: string }[] };
  console.log(body.data.map((m) => m.id).join("\n"));
}

main();
