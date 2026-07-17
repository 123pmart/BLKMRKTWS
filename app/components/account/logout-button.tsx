"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function LogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/account/logout", { method: "POST", cache: "no-store" }).catch(() => undefined);
        router.replace("/products");
        router.refresh();
      }}
    >
      {pending ? "Signing out…" : "Log out"}
    </Button>
  );
}
