import { UserButton } from "@clerk/nextjs";
import Link from "next/link";

import { Separator } from "@/components/ui/separator";
import { requireUser } from "@/lib/auth";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/matters", label: "Matters" },
];

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireUser();

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/30">
        <div className="px-5 py-5">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            CaseOS
          </Link>
        </div>
        <Separator />
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Separator />
        <div className="flex items-center gap-3 p-4">
          <UserButton />
          <div className="min-w-0 text-sm">
            <p className="truncate font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">
              {user.firmName}
            </p>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
