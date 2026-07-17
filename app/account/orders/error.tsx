"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AccountOrdersError({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="account-shell">
      <Card className="mx-auto max-w-3xl">
        <CardHeader>
          <CardTitle>Order history is unavailable</CardTitle>
          <CardDescription>No order data was returned. Try again or return to the catalog.</CardDescription>
        </CardHeader>
        <CardContent><Button type="button" onClick={reset}>Try again</Button></CardContent>
      </Card>
    </main>
  );
}
