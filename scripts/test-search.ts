import "dotenv/config";
import { db } from "../lib/db";
import { searchChunks, searchSnippets } from "../lib/search";

async function main() {
  const firm = await db.firm.findFirst({ select: { id: true } });
  const m = await db.matter.findFirst({ where: { firmId: firm!.id } });
  const d = await db.document.create({ data: {
    matterId: m!.id, title: "XSS probe", fileName: "x.txt", storagePath: "",
    mimeType: "text/plain", sizeBytes: 1, status: "READY" } });
  await db.documentChunk.create({ data: { documentId: d.id, chunkIndex: 0, pageNumber: 3,
    content: 'The threshold clause <script>alert("pwned")</script> and <img src=x onerror=alert(1)> follow.' }});

  const hits = await searchChunks(firm!.id, "threshold clause");
  const snips = await searchSnippets(hits.map(h=>h.documentId), "threshold clause");
  const s = snips.find(x=>x.documentId===d.id);
  console.log("raw snippet returned to the browser:");
  console.log("  " + s?.snippet);
  console.log("");
  const html = s?.snippet ?? "";
  const checks = {
    "no executable <script> tag": !/<script/i.test(html),
    "no <img> tag":               !/<img/i.test(html),
    // Postgres ts_headline strips recognised HTML tags outright, so <script>
    // never reaches escapeHtml. What matters is that NO raw angle bracket from
    // document content survives as markup once the marks are removed.
    "no raw markup survives":     !/[<>]/.test(html.split("<mark>").join("").split("</mark>").join("")),
    "highlight preserved":        html.includes("<mark>"),
    "no stray slash-mark":        !html.includes("/<mark>"),
    "closing mark well-formed":   html.includes("</mark>"),
  };
  for (const [k,v] of Object.entries(checks)) console.log(`${v?"PASS":"FAIL"}  ${k}`);

  await db.documentChunk.deleteMany({ where: { documentId: d.id } });
  await db.document.delete({ where: { id: d.id } });
  console.log("\nprobe removed");
  process.exitCode = Object.values(checks).every(Boolean) ? 0 : 1;
}
main().catch(e=>{console.error("ERROR:",e?.message??e);process.exitCode=1}).finally(()=>db.$disconnect());
