"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Mode = "sign-in" | "register";

interface ApiResult {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export function AuthPanel() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    setErrors({});
    const form = new FormData(event.currentTarget);
    const payload = Object.fromEntries(form.entries());
    try {
      const response = await fetch(mode === "sign-in" ? "/api/account/login" : "/api/account/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
        body: JSON.stringify(payload),
      });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.ok) {
        setMessage(result.message || "The request could not be completed.");
        setErrors(result.errors || {});
        return;
      }
      if (mode === "register") {
        setMessage(result.message || "Account request received.");
        setMode("sign-in");
        event.currentTarget.reset();
        return;
      }
      const next = search.get("next");
      router.replace(next?.startsWith("/") ? next : "/account");
      router.refresh();
    } catch {
      setMessage("The account service is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="account-auth-panel">
      <div className="account-auth-tabs" role="tablist" aria-label="Account access">
        <button type="button" role="tab" aria-selected={mode === "sign-in"} onClick={() => { setMode("sign-in"); setMessage(""); }}>Sign in</button>
        <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => { setMode("register"); setMessage(""); }}>Create account</button>
      </div>
      <form className="grid gap-4" onSubmit={submit}>
        {mode === "register" ? (
          <>
            <AccountField label="Store name" name="storeName" autoComplete="organization" error={errors.storeName} />
            <AccountField label="Contact name" name="contactName" autoComplete="name" error={errors.contactName} />
            <AccountField label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
          </>
        ) : null}
        <AccountField label="Username" name="username" autoComplete="username" error={errors.username} />
        <AccountField label="Password" name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} error={errors.password} />
        {mode === "register" ? (
          <AccountField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" error={errors.confirmPassword} />
        ) : null}
        {message ? <p className="account-form-message" role="status">{message}</p> : null}
        <Button type="submit" disabled={pending}>{pending ? "Please wait…" : mode === "register" ? "Request account" : "Sign in"}</Button>
      </form>
    </section>
  );
}

function AccountField({ label, name, type = "text", autoComplete, error }: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
  error?: string;
}) {
  return (
    <label className="grid gap-2 text-sm font-bold text-[#c8c8cd]">
      {label}
      <Input name={name} type={type} autoComplete={autoComplete} required aria-invalid={Boolean(error)} />
      {error ? <span className="text-xs text-red-300">{error}</span> : null}
    </label>
  );
}
