import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export default function SignInPage() {
  return (
    <main className="account-shell">
      <div className="mx-auto grid min-h-[70dvh] w-full max-w-md place-items-center">
        <Card className="w-full border-[#303035] bg-[#101012]">
          <CardHeader>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">BLACKMARKET Wholesale</p>
            <CardTitle>Store sign in</CardTitle>
            <CardDescription>
              Secure store authentication is being prepared. Sign-in is disabled until an identity provider and verified store mapping are connected.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <label className="grid gap-2 text-sm font-bold text-muted-foreground">
              Store email
              <Input type="email" autoComplete="email" disabled placeholder="buyer@store.com" />
            </label>
            <button className={cn(buttonVariants(), "w-full")} type="button" disabled>Continue securely</button>
            <Link className={cn(buttonVariants({ variant: "secondary" }), "w-full")} href="/products">Continue without an account</Link>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
