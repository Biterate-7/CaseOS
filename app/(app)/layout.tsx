import { AppSidebar } from "@/components/app-sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { TooltipProvider } from "@/components/ui/tooltip";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <TooltipProvider>
      <div className="flex min-h-screen bg-background">
        {/* Desktop rail. Fixed so long matter pages scroll under a stationary
            sidebar rather than dragging it out of view. */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 shrink-0 border-r bg-sidebar lg:block">
          <AppSidebar userName={user.name} firmName={user.firmName} />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          <MobileNav userName={user.name} firmName={user.firmName} />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </TooltipProvider>
  );
}
