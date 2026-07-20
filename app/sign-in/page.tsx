import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const metadata = { title: "Sign in" };

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 px-6">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Sign in to CaseOS</CardTitle>
          <CardDescription>
            Authentication is not wired up yet — Clerk integration lands in
            Phase 2. Continue to the workspace to preview the product.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" placeholder="you@yourfirm.com" disabled />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" disabled />
          </div>
          <Button
            className="w-full"
            nativeButton={false}
            render={<Link href="/dashboard" />}
          >
            Continue to workspace (preview)
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/" className="underline underline-offset-4">
              Back to home
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
