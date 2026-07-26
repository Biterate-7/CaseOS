"use client";

import {
  FileStack,
  PanelLeftClose,
  PanelRightClose,
  ShieldQuestion,
  MessageSquareQuote,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

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

/** Panels the tab strip can show. */
const PANELS = ["research", "documents", "evidence", "activity"] as const;
type Panel = (typeof PANELS)[number];

/**
 * `?tab=review` is deliberately not its own panel — it selects the research
 * panel with a filter applied. Making it a real panel would unmount the
 * research column on every toggle, discarding an in-flight question, which
 * takes 30-60s to complete and cannot be resumed.
 */
function parsePanel(raw: string | null): Panel {
  if (raw === "review") return "research";
  return PANELS.includes(raw as Panel) ? (raw as Panel) : "research";
}

/**
 * Workspace shell.
 *
 * Owns the only cross-panel state in the project view: which answer is in
 * focus (drives the sources column) and which citation is selected (drives
 * claim highlighting in the answer). Everything below this is either a server
 * component or a presentational client component, so this file is the single
 * place that behaviour lives.
 *
 * The active panel is mirrored into `?tab=` so the dashboard can deep-link
 * straight to work that needs attention. Panel changes use replaceState
 * rather than a push: the back button should return you to wherever you came
 * from, not walk you back through every tab you glanced at.
 *
 * Layout is three columns on wide screens, and a tabbed single column below
 * that — an analyst on a phone gets the same layers without a horizontal
 * scroll or a squeezed sources rail.
 */
function MatterWorkspace({ data }: { data: WorkspaceData }) {
  const { matter, documents, interactions, auditLog, stats, errors } = data;
  const searchParams = useSearchParams();
  const pathname = usePathname();

  // Derived from the URL rather than mirrored into state, so browser
  // back/forward and deep links stay correct with no synchronising effect.
  const rawTab = searchParams.get("tab");
  const panel = parsePanel(rawTab);
  const reviewMode = rawTab === "review";

  // Default focus to the most recent answer so the sources column is
  // populated on arrival rather than empty until you click something.
  const [focusedInteractionId, setFocusedInteractionId] = useState<
    string | null
  >(interactions[0]?.id ?? null);
  const [activeCitationId, setActiveCitationId] = useState<string | null>(null);
  const [showDocuments, setShowDocuments] = useState(true);
  const [showEvidence, setShowEvidence] = useState(true);

  const setTab = useCallback(
    (next: Panel | "review") => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === "research") params.delete("tab");
      else params.set("tab", next);
      const query = params.toString();
      window.history.replaceState(
        null,
        "",
        query ? `${pathname}?${query}` : pathname
      );
    },
    [pathname, searchParams]
  );

  const pendingInteractions = useMemo(
    () => interactions.filter((i) => i.reviewStatus === "PENDING_REVIEW"),
    [interactions]
  );
  const shownInteractions = reviewMode ? pendingInteractions : interactions;
  const reviewCount = pendingInteractions.length;

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
      interactions={shownInteractions}
      loadError={errors.interactions}
      reviewMode={reviewMode}
      onExitReviewMode={() => setTab("research")}
      focusedInteractionId={focusedInteractionId}
      activeCitationId={activeCitationId}
      onFocusInteraction={focusInteraction}
      onSelectCitation={setActiveCitationId}
    />
  );
  const auditPanel = <AuditTimeline entries={auditLog} loadError={errors.auditLog} />;

  const reviewToggle = reviewCount > 0 && (
    <Button
      variant={reviewMode ? "secondary" : "ghost"}
      size="sm"
      aria-pressed={reviewMode}
      onClick={() => setTab(reviewMode ? "research" : "review")}
    >
      <ShieldQuestion className="size-3.5" />
      Awaiting review
      <span className="ml-0.5 rounded-full bg-pending-surface px-2 text-meta-xs text-pending tabular-nums">
        {reviewCount}
      </span>
    </Button>
  );

  return (
    <>
      {/* ---------- Wide: three columns ---------- */}
      <div className="hidden xl:flex xl:items-start">
        {/* Side panels pin to the viewport and scroll independently. Without
            this, scrolling to the audit trail drags the sources column off
            screen — which defeats the entire point of reading a claim beside
            its proof. */}
        <aside
          className={cn(
            "sticky top-0 max-h-screen shrink-0 overflow-y-auto overscroll-contain border-r border-border bg-surface-lowest/30",
            "transition-[width] duration-[280ms] ease-(--ease-liquid)",
            showDocuments ? "w-72 2xl:w-80" : "w-0 overflow-hidden"
          )}
        >
          <div className="w-72 2xl:w-80">{documentsPanel}</div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="glass-panel sticky top-0 z-10 flex items-center gap-1 border-b border-border px-4 py-2">
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

            {/* The review filter needs a home on wide screens too, where
                there is no tab strip to carry it. */}
            {reviewToggle}

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
          <div className="border-t border-border">{auditPanel}</div>
        </div>

        <aside
          className={cn(
            "sticky top-0 max-h-screen shrink-0 overflow-y-auto overscroll-contain border-l border-border bg-surface-lowest/30",
            "transition-[width] duration-[280ms] ease-(--ease-liquid)",
            showEvidence ? "w-80 2xl:w-96" : "w-0 overflow-hidden"
          )}
        >
          <div className="w-80 2xl:w-96">{evidencePanel}</div>
        </aside>
      </div>

      {/* ---------- Narrow: tabbed single column ---------- */}
      <div className="xl:hidden">
        <Tabs
          value={panel}
          onValueChange={(value) => setTab(value as Panel)}
          className="gap-0"
        >
          <div className="glass-panel sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border px-4 py-2 lg:px-5">
            <TabsList>
              <TabsTab value="research">
                <MessageSquareQuote />
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
            {panel === "research" && reviewToggle}
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
