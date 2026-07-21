import { MatterHeader } from "@/components/matter/matter-header";
import { MatterWorkspace } from "@/components/matter/matter-workspace";
import { loadWorkspace } from "@/lib/matter-data";

export const metadata = { title: "Matter workspace" };
export const dynamic = "force-dynamic";

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
