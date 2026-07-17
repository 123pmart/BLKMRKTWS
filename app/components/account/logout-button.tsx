"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { goHome } from "@/lib/navigation/internal-history";

export function LogoutButton() {
  const [pending, setPending] = useState(false);
  return (
    <Button
      type="button"
      variant="secondary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await fetch("/api/account/logout", { method: "POST", cache: "no-store" }).catch(() => undefined);
        goHome({ replace: true });
      }}
    >
      {pending ? "Signing out…" : "Log out"}
    </Button>
  );
}
