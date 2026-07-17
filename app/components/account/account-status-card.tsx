import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AccountStatusCardProps {
  title: string;
  description: string;
  showOrdersLink?: boolean;
}

export function AccountStatusCard({ title, description, showOrdersLink = false }: AccountStatusCardProps) {
  return (
    <Card className="border-[#303035] bg-[#101012]">
      <CardHeader>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-primary">Store accounts</p>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-3">
        <Link className={cn(buttonVariants())} href="/products">Return to products</Link>
        {showOrdersLink ? (
          <Link className={cn(buttonVariants({ variant: "secondary" }))} href="/account/orders">Order history</Link>
        ) : null}
      </CardContent>
    </Card>
  );
}
