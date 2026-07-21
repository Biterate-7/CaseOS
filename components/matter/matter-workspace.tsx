"use client";

import { FileStack, PanelLeftClose, PanelRightClose, Sparkles } from "lucide-react";
import { useState } from "react";

import { AiWorkspace } from "@/components/matter/ai-workspace";
import { AuditTimeline } from "@/components/matter/audit-timeline";
import { DocumentPanel } from "@/components/matter/document-panel";
import { EvidencePanel } from "@/components/matter/evidence-panel";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { WorkspaceData } from "@/lib/matter-data";
import { cn } from "@/lib/utils";

/**
 * Workspace shell.
 *
 * Owns the only cross-panel state in the matter view: which answer is in
 * focus (drives the evidence column) and which citation is selected (drives
 * claim highlighting in the answer). Everything below this is either a server
 * component or a presentational client component, so this file is the single
 * place that behaviour lives.
 *
 * Layout is three columns on wide screens, and a tabbed single column below
 * that — an analyst on a phone gets the same five layers without a horizontal
 * scroll or a squeezed evidence rail.
 */
function MatterWorkspace({ data }: { data: WorkspaceData }) {
  const { matter, documents, interactions, auditLog, stats } = data;

  // Default focus to the most recent answer so the evidence column is
  // populated on arrival rather than empty until you click something.
  const [focusedInteractionId, setFocusedInteractionId] = useState<
    string | null
  >(interactions[0]?.id ?? null);
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const [showDocuments, setShowDocuments] = useState(true);
  const [showEvidence, setShowEvidence] = useState(true);

  const focused =
    interactions.find((i) => i.id === focusedInteractionId) ?? null;

  function focusInteraction(id: string) {
    if (id === focusedInteractionId) return;
    setFocusedInteractionId(id);
    setActiveCitationId(null);
  }

  const documentsPanel = (
    <DocumentPanel matterId={matter.id} documents={documents} />
  );
  const evidencePanel = (
    <EvidencePanel
      interaction={focused}
      activeCitationId={activeCitationId}
      onSelectCitation={setActiveCitationId}
    />
  );
  const researchPanel = (
    <AiWorkspace
      matterId={matter.id}
      readyDocumentCount={stats.readyDocumentCount}
      interactions={interactions}
      focusedInteractionId={focusedInteractionId}
      activeCitationId={activeCitationId}
      onFocusInteraction={focusInteraction}
      onSelectCitation={setActiveCitationId}
    />
  );
  const auditPanel = <AuditTimeline entries={auditLog} />;

  return (
    <>
      {/* ---------- Wide: three columns ---------- */}
      <div className="hidden xl:flex xl:items-start">
        {/* Side panels pin to the viewport and scroll independently. Without
            this, scrolling to the audit trail drags the evidence column off
            screen — which defeats the entire point of reading a claim beside
            its proof. */}
        <aside
          className={cn(
            "sticky top-0 max-h-screen shrink-0 overflow-y-auto overscroll-contain border-r bg-sidebar/40",
            "transition-[width] duration-300 ease-(--ease-out-quart)",
            showDocuments ? "w-72 2xl:w-80" : "w-0 overflow-hidden"
          )}
        >
          <div className="w-72 2xl:w-80">{documentsPanel}</div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1 border-b px-3 py-1.5">
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={
                      showDocuments ? "Hide documents" : "Show documents"
                    }
                    aria-pressed={showDocuments}
                    onClick={() => setShowDocuments((v) => !v)}
                  >
                    <PanelLeftClose
                      className={cn(
                        "transition-transform duration-200",
                        !showDocuments && "rotate-180"
                      )}
                    />
                  </Button>
                }
              />
              <TooltipContent>
                {showDocuments ? "Hide documents" : "Show documents"}
              </TooltipContent>
            </Tooltip>

            <span className="flex-1" />

            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={showEvidence ? "Hide sources" : "Show sources"}
                    aria-pressed={showEvidence}
                    onClick={() => setShowEvidence((v) => !v)}
                  >
                    <PanelRightClose
                      className={cn(
                        "transition-transform duration-200",
                        !showEvidence && "rotate-180"
                      )}
                    />
                  </Button>
                }
              />
              <TooltipContent>
                {showEvidence ? "Hide sources" : "Show sources"}
              </TooltipContent>
            </Tooltip>
          </div>

          {researchPanel}
          <div className="border-t">{auditPanel}</div>
        </div>

        <aside
          className={cn(
            "sticky top-0 max-h-screen shrink-0 overflow-y-auto overscroll-contain border-l bg-sidebar/40",
            "transition-[width] duration-300 ease-(--ease-out-quart)",
            showEvidence ? "w-80 2xl:w-96" : "w-0 overflow-hidden"
          )}
        >
          <div className="w-80 2xl:w-96">{evidencePanel}</div>
        </aside>
      </div>

      {/* ---------- Narrow: tabbed single column ---------- */}
      <div className="xl:hidden">
        <Tabs defaultValue="research" className="gap-0">
          <div className="border-b px-4 py-2 lg:px-5">
            <TabsList>
              <TabsTab value="research">
                <Sparkles />
                Research
              </TabsTab>
              <TabsTab value="documents">
                <FileStack />
                Documents
                <span className="ml-0.5 tabular-nums opacity-60">
                  {stats.documentCount}
                </span>
              </TabsTab>
              <TabsTab value="evidence">Sources</TabsTab>
              <TabsTab value="activity">Activity</TabsTab>
            </TabsList>
          </div>

          <TabsPanel value="research">{researchPanel}</TabsPanel>
          <TabsPanel value="documents">{documentsPanel}</TabsPanel>
          <TabsPanel value="evidence">{evidencePanel}</TabsPanel>
          <TabsPanel value="activity">{auditPanel}</TabsPanel>
        </Tabs>
      </div>
    </>
  );
}

export { MatterWorkspace };
