import { unstable_rethrow } from "next/navigation";

import { MatterHeader } from "@/components/matter/matter-header";
import { MatterWorkspace } from "@/components/matter/matter-workspace";
import { WorkspaceLoadError } from "@/components/matter/workspace-load-error";
import { logError } from "@/lib/log";
import { loadWorkspace, type WorkspaceData } from "@/lib/matter-data";

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

  // Firm scoping and the 404-on-cross-firm-id behaviour live in loadWorkspace,
  // which also isolates its own secondary-section failures. The remaining way
  // this can throw is an essential-data failure (or notFound): catch it so a
  // transient blip renders a scoped, in-shell retry instead of collapsing the
  // whole authenticated shell to the global error boundary.
  let data: WorkspaceData;
  try {
    data = await loadWorkspace(matterId);
  } catch (error) {
    // notFound()/redirect() throw framework control-flow errors — these must
    // propagate so the 404/redirect actually happens.
    unstable_rethrow(error);
    const reference = logError("workspace_page_load_failed", { matterId }, error);
    return <WorkspaceLoadError reference={reference} />;
  }

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
