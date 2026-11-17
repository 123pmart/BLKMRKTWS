"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, KeyboardEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SALESPERSONS } from "@/lib/salespeople";

type Mode = "sign-in" | "register";

interface ApiResult {
  ok?: boolean;
  message?: string;
  errors?: Record<string, string>;
}

export function AuthPanel() {
  const router = useRouter();
  const search = useSearchParams();
  const [mode, setMode] = useState<Mode>(() => search.get("mode") === "register" ? "register" : "sign-in");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  function selectMode(nextMode: Mode) {
    setMode(nextMode);
    setMessage("");
    setErrors({});
  }

  function handleTabKey(event: KeyboardEvent<HTMLDivElement>) {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const nextMode = event.key === "Home" ? "sign-in" : event.key === "End" ? "register"
      : mode === "sign-in" ? "register" : "sign-in";
    selectMode(nextMode);
    event.currentTarget.querySelector<HTMLButtonElement>(`[data-mode="${nextMode}"]`)?.focus();
  }

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
      try {
        window.localStorage.setItem("blackmarket-store-account-known-v1", "true");
      } catch {
        // The server session remains authoritative when device storage is unavailable.
      }
      if (mode === "register") {
        router.replace("/account");
        return;
      }
      const next = search.get("next");
      router.replace(next?.startsWith("/") ? next : "/account");
    } catch {
      setMessage("The account service is temporarily unavailable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="account-auth-panel">
      <div className="account-auth-tabs" role="tablist" aria-label="Account access" onKeyDown={handleTabKey}>
        <Button id="account-sign-in-tab" data-mode="sign-in" variant="ghost" type="button" role="tab" aria-controls="account-auth-form" tabIndex={mode === "sign-in" ? 0 : -1} aria-selected={mode === "sign-in"} onClick={() => selectMode("sign-in")}>Sign in</Button>
        <Button id="account-register-tab" data-mode="register" variant="ghost" type="button" role="tab" aria-controls="account-auth-form" tabIndex={mode === "register" ? 0 : -1} aria-selected={mode === "register"} onClick={() => selectMode("register")}>Create account</Button>
      </div>
      <form id="account-auth-form" className="account-auth-form" data-mode={mode} role="tabpanel" aria-labelledby={mode === "register" ? "account-register-tab" : "account-sign-in-tab"} aria-busy={pending} onSubmit={submit}>
        {mode === "register" ? (
          <>
            <AccountField label="Store name" name="storeName" autoComplete="organization" error={errors.storeName} />
            <AccountField label="Contact name" name="contactName" autoComplete="name" error={errors.contactName} />
            <AccountField label="Email" name="email" type="email" autoComplete="email" error={errors.email} />
            <label className="account-auth-field">
              Salesperson
              <select id="account-salesperson" name="salesperson" required defaultValue="" aria-invalid={Boolean(errors.salesperson)} aria-describedby={errors.salesperson ? "account-salesperson-error" : undefined}>
                <option value="" disabled>Select a salesperson</option>
                {SALESPERSONS.map((person) => <option key={person.id} value={person.id}>{person.label}</option>)}
              </select>
              {errors.salesperson ? <span id="account-salesperson-error" className="account-field-error">{errors.salesperson}</span> : null}
            </label>
          </>
        ) : null}
        <AccountField label="Username" name="username" autoComplete="username" error={errors.username} fullWidth />
        <AccountField label="Password" name="password" type="password" autoComplete={mode === "register" ? "new-password" : "current-password"} error={errors.password} hint={mode === "register" ? "At least 10 characters, including a letter and number." : undefined} />
        {mode === "register" ? (
          <AccountField label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" error={errors.confirmPassword} />
        ) : null}
        {message ? <p className="account-form-message" role="status">{message}</p> : null}
        <Button className="account-auth-submit" type="submit" disabled={pending}>{pending ? "Please wait…" : mode === "register" ? "Create account" : "Sign in"}</Button>
      </form>
    </section>
  );
}

function AccountField({ label, name, type = "text", autoComplete, error, hint, fullWidth = false }: {
  label: string;
  name: string;
  type?: string;
  autoComplete: string;
  error?: string;
  hint?: string;
  fullWidth?: boolean;
}) {
  return (
    <label className="account-auth-field" data-full-width={fullWidth || undefined}>
      {label}
      <Input id={`account-${name}`} name={name} type={type} autoComplete={autoComplete} autoCapitalize={name === "username" || type === "email" ? "none" : undefined} spellCheck={name === "username" || type === "password" ? false : undefined} required aria-invalid={Boolean(error)} aria-describedby={error ? `account-${name}-error` : hint ? `account-${name}-hint` : undefined} />
      {error ? <span id={`account-${name}-error`} className="account-field-error">{error}</span> : hint ? <span id={`account-${name}-hint`} className="account-field-hint">{hint}</span> : null}
    </label>
  );
}
