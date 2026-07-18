"use client";

import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { StoreProfile } from "@/types";

export function ProfileEditor({ profile }: { profile: StoreProfile }) {
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setMessage("");
    const body = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-Blackmarket-Request": "portal" },
      body: JSON.stringify(body),
    });
    const result = await response.json().catch(() => ({}));
    setMessage(response.ok ? "Profile saved." : result.message || "Profile could not be saved.");
    setPending(false);
  }
  return (
    <form className="profile-editor" onSubmit={submit}>
      <div className="profile-editor__grid">
        {FIELDS.map((field) => <label key={field.name}><span>{field.label}</span><Input name={field.name} type={field.type || "text"} autoComplete={field.autoComplete} defaultValue={profile[field.name]} required /></label>)}
      </div>
      <div className="profile-editor__actions"><Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>{message ? <p role="status">{message}</p> : null}</div>
    </form>
  );
}

const FIELDS: Array<{ name: keyof StoreProfile; label: string; autoComplete: string; type?: string }> = [
  { name: "storeName", label: "Store name", autoComplete: "organization" },
  { name: "contactName", label: "Contact name", autoComplete: "name" },
  { name: "email", label: "Email", autoComplete: "email", type: "email" },
  { name: "phone", label: "Phone", autoComplete: "tel", type: "tel" },
  { name: "street", label: "Street", autoComplete: "shipping street-address" },
  { name: "city", label: "City", autoComplete: "shipping address-level2" },
  { name: "state", label: "State", autoComplete: "shipping address-level1" },
  { name: "zip", label: "ZIP", autoComplete: "shipping postal-code" },
];
