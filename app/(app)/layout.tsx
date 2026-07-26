import { Suspense } from "react";

import { AppSidebar } from "@/components/app-sidebar";
import { AppTopbar } from "@/components/app-topbar";
import { MobileNav } from "@/components/mobile-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  // Feeds the rail's project switcher. Scoped by firmId like every other query
  // in the app, and capped — the switcher is for jumping back into recent work,
  // not for browsing the whole workspace.
  const projects = await db.matter.findMany({
    where: { firmId: user.firmId },
    orderBy: { updatedAt: "desc" },
    take: 6,
    select: { id: true, title: true },
  });

  return (
    <TooltipProvider>
      <div className="flex min-h-screen">
        {/* Desktop rail. Fixed so long pages scroll under a stationary sidebar
            rather than dragging it out of view. */}
        <aside className="glass-panel fixed inset-y-0 left-0 z-40 hidden w-rail shrink-0 border-r border-border lg:block">
          <AppSidebar
            userName={user.name}
            firmName={user.firmName}
            projects={projects}
          />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-rail">
          <MobileNav
            userName={user.name}
            firmName={user.firmName}
            projects={projects}
          />
          {/* Suspense: AppTopbar reads searchParams, which opts the subtree into
              dynamic rendering. Bounding it here keeps that local to the bar. */}
          <Suspense fallback={<div className="hidden h-topbar lg:block" />}>
            <AppTopbar />
          </Suspense>
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
