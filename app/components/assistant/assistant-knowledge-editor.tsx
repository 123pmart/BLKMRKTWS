"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";

import type {
  AssistantIngredient,
  AssistantProduct,
  IngredientRole,
  KnowledgeVerification,
  ProductKnowledgeOverride,
} from "@/lib/assistant/types";

const VERIFICATION: KnowledgeVerification[] = ["unverified", "needs-review", "verified", "archived"];
const UNITS = ["", "mcg", "mg", "g"] as const;

export function AssistantKnowledgeEditor({
  products,
  adminName,
  canVerify,
  canRelease,
  assistantEnabled: initialAssistantEnabled,
}: {
  products: AssistantProduct[];
  adminName: string;
  canVerify: boolean;
  canRelease: boolean;
  assistantEnabled: boolean;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(products[0]?.id ?? "");
  const selected = products.find((product) => product.id === selectedId);
  const [draft, setDraft] = useState(() => selected ? editorDraft(selected) : null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [assistantEnabled, setAssistantEnabled] = useState(initialAssistantEnabled);
  const [releaseSaving, setReleaseSaving] = useState(false);
  const [releaseMessage, setReleaseMessage] = useState("");
  const visible = useMemo(() => {
    const term = query.toLowerCase().trim();
    return term ? products.filter((product) => `${product.shortName} ${product.name}`.toLowerCase().includes(term)) : products;
  }, [products, query]);

  function selectProduct(product: AssistantProduct) {
    setSelectedId(product.id);
    setDraft(editorDraft(product));
    setMessage("");
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft || !selected) return;
    setSaving(true);
    setMessage("");
    const record = recordFromDraft(selected, draft);
    try {
      const response = await fetch("/api/admin/assistant-knowledge", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || "Unable to save Assistant Knowledge.");
      setMessage("Assistant Knowledge saved to the shared content store.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Assistant Knowledge could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  async function updateCustomerAccess() {
    if (!canRelease || releaseSaving) return;
    const enabled = !assistantEnabled;
    setReleaseSaving(true);
    setReleaseMessage("");
    try {
      const response = await fetch("/api/admin/assistant-knowledge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || "Unable to update BLACKMARKET AI access.");
      setAssistantEnabled(Boolean(result.assistantEnabled));
      setReleaseMessage(enabled ? "BLACKMARKET AI is now available to customers." : "BLACKMARKET AI is hidden from customers. Admin preview remains available.");
    } catch (error) {
      setReleaseMessage(error instanceof Error ? error.message : "BLACKMARKET AI access could not be updated.");
    } finally {
      setReleaseSaving(false);
    }
  }

  return (
    <main className="knowledge-shell">
      <header className="knowledge-header">
        <div>
          <p>BLACKMARKET product assistant</p>
          <h1>Assistant Knowledge</h1>
          <span>Review formula facts, positioning, aliases, and approved product relationships.</span>
        </div>
        <div>
          <span>Signed in as {adminName}</span>
          <Link href="/admin">Back to Admin</Link>
        </div>
      </header>

      <section className="knowledge-release" data-enabled={assistantEnabled ? "true" : "false"}>
        <div>
          <p>Customer release</p>
          <h2>{assistantEnabled ? "BLACKMARKET AI is live" : "BLACKMARKET AI is hidden"}</h2>
          <span>
            {assistantEnabled
              ? "Customers can open the assistant from portal navigation."
              : "Customers cannot see or open the assistant. Signed-in admins can continue testing it."}
          </span>
          {releaseMessage ? <small role="status">{releaseMessage}</small> : null}
        </div>
        <div>
          <Link href="/assistant" target="_blank" rel="noreferrer">Open Test Console</Link>
          <button type="button" onClick={updateCustomerAccess} disabled={!canRelease || releaseSaving}>
            {releaseSaving ? "Saving…" : assistantEnabled ? "Disable Customer Access" : "Activate for Customers"}
          </button>
          {!canRelease ? <small>Only Parker can change customer access.</small> : null}
        </div>
      </section>

      <div className="knowledge-layout">
        <aside className="knowledge-products">
          <label>
            <span>Find product</span>
            <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="Search products" />
          </label>
          <div>
            {visible.map((product) => (
              <button
                key={product.id}
                type="button"
                data-active={product.id === selectedId ? "true" : "false"}
                onClick={() => selectProduct(product)}
              >
                <Image src={product.image || "/spyguy-white.png"} alt="" width={64} height={64} />
                <span>
                  <strong>{product.shortName}</strong>
                  <small>{product.formula.verification.replace("-", " ")}</small>
                </span>
              </button>
            ))}
          </div>
        </aside>

        {selected && draft ? (
          <form className="knowledge-editor" onSubmit={save}>
            <section className="knowledge-editor-title">
              <div>
                <p>{selected.category}</p>
                <h2>{selected.name}</h2>
                <span>{selected.variants.length} represented variants</span>
              </div>
              <label>
                <span>Knowledge status</span>
                <select
                  value={draft.verification}
                  onChange={(event) => setDraft({ ...draft, verification: event.target.value as KnowledgeVerification })}
                >
                  {VERIFICATION.map((status) => (
                    <option key={status} value={status} disabled={status === "verified" && !canVerify}>{labelStatus(status)}</option>
                  ))}
                </select>
              </label>
            </section>

            {!canVerify ? (
              <p className="knowledge-permission-note">You can edit and flag records for review. Only Parker can mark product or formula knowledge Verified.</p>
            ) : null}

            <EditorSection title="Retail positioning" subtitle="Approved language used in answers and recommendation reasons.">
              <TextAreaField label="Primary purpose" value={draft.purpose} onChange={(purpose) => setDraft({ ...draft, purpose })} />
              <TextAreaField label="Retailer sales pitch" value={draft.retailerPitch} onChange={(retailerPitch) => setDraft({ ...draft, retailerPitch })} />
              <LineField label="Best for — one item per line" value={draft.bestFor} onChange={(bestFor) => setDraft({ ...draft, bestFor })} />
              <LineField label="Not ideal for — one item per line" value={draft.notIdealFor} onChange={(notIdealFor) => setDraft({ ...draft, notIdealFor })} />
              <LineField label="Key differentiators — one item per line" value={draft.keyDifferentiators} onChange={(keyDifferentiators) => setDraft({ ...draft, keyDifferentiators })} />
            </EditorSection>

            <EditorSection title="Search and classification" subtitle="Aliases and goals power deterministic question matching.">
              <LineField label="Aliases — one item per line" value={draft.aliases} onChange={(aliases) => setDraft({ ...draft, aliases })} />
              <LineField label="Common misspellings — one item per line" value={draft.commonMisspellings} onChange={(commonMisspellings) => setDraft({ ...draft, commonMisspellings })} />
              <LineField label="Goal tags — one per line" value={draft.goals} onChange={(goals) => setDraft({ ...draft, goals: goals as AssistantProduct["goals"] })} />
            </EditorSection>

            <EditorSection title="Verified formula" subtitle="Only mark this Verified after checking the linked Supplement Facts source.">
              <div className="knowledge-form-grid">
                <label>
                  <span>Formula status</span>
                  <select
                    value={draft.formulaVerification}
                    onChange={(event) => setDraft({ ...draft, formulaVerification: event.target.value as KnowledgeVerification })}
                  >
                    {VERIFICATION.map((status) => (
                      <option key={status} value={status} disabled={status === "verified" && !canVerify}>{labelStatus(status)}</option>
                    ))}
                  </select>
                </label>
                <label><span>Serving size</span><input value={draft.servingSize} onChange={(event) => setDraft({ ...draft, servingSize: event.target.value })} /></label>
                <label><span>Servings/container</span><input type="number" min="1" value={draft.servingsPerContainer} onChange={(event) => setDraft({ ...draft, servingsPerContainer: event.target.value })} /></label>
                <label><span>Total caffeine mg</span><input type="number" min="0" value={draft.totalCaffeineMg} onChange={(event) => setDraft({ ...draft, totalCaffeineMg: event.target.value })} /></label>
                <label><span>Caffeine serving basis</span><input value={draft.caffeineServingBasis} onChange={(event) => setDraft({ ...draft, caffeineServingBasis: event.target.value })} /></label>
                <label className="knowledge-check"><input type="checkbox" checked={draft.stimulantFree} onChange={(event) => setDraft({ ...draft, stimulantFree: event.target.checked })} /><span>Verified stimulant-free</span></label>
              </div>

              <div className="knowledge-ingredient-head">
                <span>Structured ingredients</span>
                <button type="button" onClick={() => setDraft({ ...draft, ingredients: [...draft.ingredients, blankIngredient(selected.id)] })}>Add ingredient</button>
              </div>
              <div className="knowledge-ingredients">
                {draft.ingredients.map((ingredient, index) => (
                  <div key={`${ingredient.normalizedName}-${index}`} className="knowledge-ingredient-row">
                    <label><span>Name</span><input value={ingredient.name} onChange={(event) => updateIngredient(index, { name: event.target.value })} /></label>
                    <label><span>Amount</span><input type="number" min="0" step="any" value={ingredient.amount ?? ""} onChange={(event) => updateIngredient(index, { amount: event.target.value === "" ? undefined : Number(event.target.value) })} /></label>
                    <label><span>Unit</span><select value={ingredient.unit ?? ""} onChange={(event) => updateIngredient(index, { unit: event.target.value ? event.target.value as AssistantIngredient["unit"] : undefined })}>{UNITS.map((unit) => <option key={unit || "none"} value={unit}>{unit || "Not disclosed"}</option>)}</select></label>
                    <label><span>Roles</span><input value={ingredient.roles.join(", ")} onChange={(event) => updateIngredient(index, { roles: splitComma(event.target.value) as IngredientRole[] })} /></label>
                    <label><span>Disclosure</span><select value={ingredient.disclosure} onChange={(event) => updateIngredient(index, { disclosure: event.target.value as AssistantIngredient["disclosure"] })}><option value="exact">Exact</option><option value="official-highlight">Official highlight</option><option value="listed-in-blend">Listed in blend</option><option value="blend-total">Blend total</option></select></label>
                    <label className="knowledge-check"><input type="checkbox" checked={ingredient.verified} onChange={(event) => updateIngredient(index, { verified: event.target.checked })} /><span>Verified</span></label>
                    <button type="button" className="knowledge-remove" onClick={() => setDraft({ ...draft, ingredients: draft.ingredients.filter((_, itemIndex) => itemIndex !== index) })}>Remove</button>
                  </div>
                ))}
              </div>
              <LineField label="Formula review notes" value={draft.reviewNotes} onChange={(reviewNotes) => setDraft({ ...draft, reviewNotes })} />
            </EditorSection>

            <EditorSection title="Product relationships" subtitle="Use stable product IDs, one per line.">
              <LineField label="Commonly compared with" value={draft.comparedWith} onChange={(comparedWith) => setDraft({ ...draft, comparedWith })} />
              <LineField label="Complements" value={draft.complements} onChange={(complements) => setDraft({ ...draft, complements })} />
              <LineField label="Substitutes" value={draft.substitutes} onChange={(substitutes) => setDraft({ ...draft, substitutes })} />
            </EditorSection>

            <EditorSection title="Source traceability" subtitle="These are the records currently supporting customer answers.">
              <div className="knowledge-source-list">
                {selected.sources.map((source) => (
                  <div key={source.id}>
                    <strong>{source.type.replaceAll("-", " ")}</strong>
                    {source.location.startsWith("/") ? <a href={source.location} target="_blank" rel="noreferrer">{source.location}</a> : <span>{source.location}</span>}
                    {source.note ? <small>{source.note}</small> : null}
                  </div>
                ))}
              </div>
            </EditorSection>

            <footer className="knowledge-save-bar">
              <span role="status">{message}</span>
              <button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Assistant Knowledge"}</button>
            </footer>
          </form>
        ) : null}
      </div>
    </main>
  );

  function updateIngredient(index: number, update: Partial<AssistantIngredient>) {
    if (!draft) return;
    const ingredients = draft.ingredients.map((ingredient, itemIndex) => itemIndex === index
      ? {
          ...ingredient,
          ...update,
          normalizedName: update.name === undefined ? ingredient.normalizedName : normalize(update.name),
        }
      : ingredient);
    setDraft({ ...draft, ingredients });
  }
}

function EditorSection({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="knowledge-section">
      <header><h3>{title}</h3><p>{subtitle}</p></header>
      <div>{children}</div>
    </section>
  );
}

function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="knowledge-full-field"><span>{label}</span><textarea rows={4} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function LineField({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return <label className="knowledge-full-field"><span>{label}</span><textarea rows={3} value={value.join("\n")} onChange={(event) => onChange(splitLines(event.target.value))} /></label>;
}

function editorDraft(product: AssistantProduct) {
  return {
    verification: product.verification,
    purpose: product.purpose,
    retailerPitch: product.retailerPitch,
    bestFor: [...product.bestFor],
    notIdealFor: [...product.notIdealFor],
    keyDifferentiators: [...product.keyDifferentiators],
    aliases: [...product.aliases],
    commonMisspellings: [...product.commonMisspellings],
    goals: [...product.goals],
    formulaVerification: product.formula.verification,
    servingSize: product.formula.servingSize ?? "",
    servingsPerContainer: product.formula.servingsPerContainer?.toString() ?? "",
    totalCaffeineMg: product.formula.totalCaffeineMg?.toString() ?? "",
    caffeineServingBasis: product.formula.caffeineServingBasis ?? "",
    stimulantFree: product.formula.stimulantFree,
    ingredients: product.formula.ingredients.map((ingredient) => ({ ...ingredient, roles: [...ingredient.roles], sourceIds: [...ingredient.sourceIds] })),
    reviewNotes: [...(product.formula.reviewNotes ?? [])],
    comparedWith: [...product.relationships.commonlyComparedWith],
    complements: [...product.relationships.complements],
    substitutes: [...product.relationships.substitutes],
  };
}

function recordFromDraft(product: AssistantProduct, draft: ReturnType<typeof editorDraft>): ProductKnowledgeOverride {
  return {
    productId: product.id,
    shortName: product.shortName,
    aliases: draft.aliases,
    commonMisspellings: draft.commonMisspellings,
    purpose: draft.purpose,
    retailerPitch: draft.retailerPitch,
    bestFor: draft.bestFor,
    notIdealFor: draft.notIdealFor,
    keyDifferentiators: draft.keyDifferentiators,
    goals: draft.goals,
    formula: {
      servingSize: draft.servingSize || undefined,
      servingsPerContainer: draft.servingsPerContainer ? Number(draft.servingsPerContainer) : undefined,
      totalCaffeineMg: draft.totalCaffeineMg === "" ? undefined : Number(draft.totalCaffeineMg),
      caffeineServingBasis: draft.caffeineServingBasis || undefined,
      stimulantFree: draft.stimulantFree,
      ingredients: draft.ingredients,
      verification: draft.formulaVerification,
      reviewNotes: draft.reviewNotes,
    },
    relationships: {
      commonlyComparedWith: draft.comparedWith,
      complements: draft.complements,
      substitutes: draft.substitutes,
    },
    verification: draft.verification,
  };
}

function blankIngredient(productId: string): AssistantIngredient {
  return {
    name: "",
    normalizedName: "",
    disclosure: "official-highlight",
    roles: ["other"],
    verified: false,
    sourceIds: [`${productId}:admin`],
  };
}

function splitLines(value: string): string[] {
  return value.split(/\n+/).map((item) => item.trim()).filter(Boolean);
}

function splitComma(value: string): string[] {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[™®]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function labelStatus(value: string): string {
  return value.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}
