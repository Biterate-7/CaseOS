import { MatterHeader } from "@/components/matter/matter-header";
import { MatterWorkspace } from "@/components/matter/matter-workspace";
import { loadWorkspace } from "@/lib/matter-data";

export const metadata = { title: "Matter workspace" };
export const dynamic = "force-dynamic";

// Server actions inherit this segment's limit. Ingestion (extract → chunk →
// embed → store) runs inline in finalizeDocumentUpload and comfortably exceeds
// the 10s default on a long PDF. 60s is the Vercel Hobby ceiling; raise it on
// Pro if large documents still time out.
export const maxDuration = 60;

export default async function MatterWorkspacePage({
  params,
}: {
  params: Promise<{ matterId: string }>;
}) {
  const { matterId } = await params;
  // Firm scoping and the 404-on-cross-firm-id behaviour live in loadWorkspace.
  const data = await loadWorkspace(matterId);

  return (
    <div className="flex min-h-full flex-col">
      <MatterHeader
        matter={data.matter}
        members={data.members}
        stats={data.stats}
      />
      <MatterWorkspace data={data} />
    </div>
  );
}
