"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  answerAssistantQuestion,
  normalizeAssistantText,
} from "@/lib/assistant/engine";
import type {
  AssistantCartAction,
  AssistantContext,
  AssistantProduct,
  AssistantResponse,
  AssistantVariant,
} from "@/lib/assistant/types";

const CART_KEY = "blackmarket-wholesale-cart-v4";
const RECENT_KEY = "blackmarket-product-assistant-recent-v1";
const MAX_RECENT = 6;

const STARTERS = [
  "Compare DEFY and RULE",
  "Which products contain creatine?",
  "Show stimulant-free products",
  "Which product has the most caffeine?",
  "Build a balanced starter order",
  "What are the best MAP margins?",
];

interface ConversationTurn {
  id: string;
  question: string;
  response: AssistantResponse;
}

interface UndoState {
  cart: Record<string, number>;
  label: string;
}

export function ProductAssistant({
  products,
  accountName,
  maintenanceMode,
}: {
  products: AssistantProduct[];
  accountName?: string;
  maintenanceMode: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [context, setContext] = useState<AssistantContext>({ productIds: [], variantIds: [] });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [recent, setRecent] = useState<string[]>([]);
  const [undo, setUndo] = useState<UndoState | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const conversationEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hydrateExternalState = () => {
      setCart(readCart());
      try {
        const stored = JSON.parse(window.sessionStorage.getItem(RECENT_KEY) || "[]") as unknown;
        if (Array.isArray(stored)) setRecent(stored.filter((item): item is string => typeof item === "string").slice(0, MAX_RECENT));
      } catch {
        setRecent([]);
      }
    };
    const timer = window.setTimeout(hydrateExternalState, 0);
    window.addEventListener("storage", hydrateExternalState);
    window.addEventListener("blackmarket:cart-updated", hydrateExternalState);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", hydrateExternalState);
      window.removeEventListener("blackmarket:cart-updated", hydrateExternalState);
    };
  }, []);

  useEffect(() => {
    conversationEndRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }, [turns]);

  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const cartUnits = Object.values(cart).reduce((total, value) => total + Math.max(0, Math.floor(Number(value) || 0)), 0);

  function ask(nextQuestion: string) {
    const clean = nextQuestion.trim();
    if (!clean) return;
    const response = answerAssistantQuestion(clean, products, { context, cart });
    setTurns((current) => [...current, { id: `${response.id}-${current.length}`, question: clean, response }]);
    if (response.nextContext.productIds.length || response.nextContext.variantIds.length) setContext(response.nextContext);
    setQuestion("");
    rememberQuestion(clean);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
  }

  function rememberQuestion(value: string) {
    const next = [value, ...recent.filter((item) => normalizeAssistantText(item) !== normalizeAssistantText(value))].slice(0, MAX_RECENT);
    setRecent(next);
    try {
      window.sessionStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      // Session history is an enhancement; the assistant still works without storage.
    }
  }

  function queueDirectAdd(product: AssistantProduct, variant: AssistantVariant, quantity: number) {
    const response: AssistantResponse = {
      id: `direct-${variant.id}-${Date.now()}`,
      intent: "add_to_cart",
      directAnswer: `Add ${quantity} × ${product.shortName} ${variant.flavor}. Confirm to update the wholesale cart.`,
      details: ["Availability and price are revalidated when the final order is submitted."],
      productIds: [product.id],
      pendingAction: {
        type: "add",
        label: `Add ${quantity} × ${product.shortName} ${variant.flavor}`,
        updates: [{ variantId: variant.id, quantity, mode: "add" }],
      },
      nextContext: { productIds: [product.id], variantIds: [variant.id], lastIntent: "add_to_cart" },
      responseType: "cart-action",
    };
    setTurns((current) => [...current, {
      id: `${response.id}-${current.length}`,
      question: `Add ${quantity} × ${product.shortName} ${variant.flavor}`,
      response,
    }]);
    setContext(response.nextContext);
  }

  function applyAction(action: AssistantCartAction) {
    if (maintenanceMode) return;
    const previous = { ...cart };
    const next = { ...cart };
    for (const update of action.updates) {
      if (update.mode === "remove") {
        delete next[update.variantId];
      } else if (update.mode === "set") {
        if (update.quantity <= 0) delete next[update.variantId];
        else next[update.variantId] = clampQuantity(update.quantity);
      } else {
        next[update.variantId] = clampQuantity((next[update.variantId] ?? 0) + update.quantity);
      }
    }
    writeCart(next);
    setCart(next);
    setUndo({ cart: previous, label: action.label });
    setTurns((current) => current.map((turn, index) => index === current.length - 1
      ? {
          ...turn,
          response: {
            ...turn.response,
            directAnswer: `${action.label}. Cart updated.`,
            details: ["You can undo this change below or open the cart to continue checkout."],
            pendingAction: undefined,
            responseType: "answer",
          },
        }
      : turn));
  }

  function undoLastAction() {
    if (!undo) return;
    writeCart(undo.cart);
    setCart(undo.cart);
    setUndo(null);
  }

  return (
    <div className="assistant-layout">
      <section className="assistant-intro" aria-labelledby="assistant-title">
        <div className="assistant-spy">
          <Image src="/spyguy-white.png" alt="" width={900} height={900} priority />
        </div>
        <div>
          <p className="assistant-kicker">BLACKMARKET product intelligence</p>
          <h1 id="assistant-title">Ask Spy Guy.</h1>
          <p>
            Verified formula, comparison, pricing, stocking, staff-training, and cart help for wholesale stores.
            No third-party AI service is used.
          </p>
          {accountName ? <span className="assistant-account-context">Pricing for {accountName}</span> : <span className="assistant-account-context">Standard wholesale pricing</span>}
        </div>
      </section>

      {maintenanceMode ? (
        <aside className="assistant-maintenance-note">
          Ordering is paused. Product questions still work, but cart changes are disabled.
        </aside>
      ) : null}

      <div className="assistant-workspace">
        <aside className="assistant-start-panel" aria-label="Suggested product questions">
          <p className="assistant-section-label">Start here</p>
          <div className="assistant-starter-list">
            {STARTERS.map((starter) => (
              <button key={starter} type="button" onClick={() => ask(starter)}>{starter}</button>
            ))}
          </div>
          {recent.length ? (
            <>
              <p className="assistant-section-label assistant-recent-label">Recent this session</p>
              <div className="assistant-recent-list">
                {recent.map((item) => <button key={item} type="button" onClick={() => ask(item)}>{item}</button>)}
              </div>
            </>
          ) : null}
          <div className="assistant-guardrail">
            <strong>Verified answers only</strong>
            <span>When formula data is missing or conflicting, Spy Guy will say so instead of guessing.</span>
          </div>
        </aside>

        <section className="assistant-conversation" aria-label="Product assistant conversation">
          {!turns.length ? (
            <div className="assistant-empty-state">
              <Image src="/spyguy-white.png" alt="" width={900} height={900} />
              <strong>Ready for product questions.</strong>
              <span>Try a comparison, ingredient search, stocking goal, price question, or cart request.</span>
            </div>
          ) : (
            <div className="assistant-turns" aria-live="polite">
              {turns.map((turn, index) => (
                <article className="assistant-turn" key={turn.id}>
                  <p className="assistant-question"><span>You</span>{turn.question}</p>
                  <AssistantAnswer
                    response={turn.response}
                    products={turn.response.productIds.map((id) => productById.get(id)).filter((product): product is AssistantProduct => Boolean(product))}
                    maintenanceMode={maintenanceMode}
                    onApplyAction={index === turns.length - 1 ? applyAction : undefined}
                    onDirectAdd={queueDirectAdd}
                    onSuggestion={ask}
                  />
                </article>
              ))}
              <div ref={conversationEndRef} />
            </div>
          )}

          {undo ? (
            <div className="assistant-undo" role="status">
              <span>Cart changed: {undo.label}</span>
              <button type="button" onClick={undoLastAction}>Undo</button>
            </div>
          ) : null}

          <form className="assistant-composer" onSubmit={submit}>
            <label htmlFor="assistant-question">Ask about products, formulas, pricing, or your order</label>
            <div>
              <input
                ref={inputRef}
                id="assistant-question"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                placeholder="What is the difference between DEFY and RULE?"
                autoComplete="off"
                enterKeyHint="send"
              />
              <button type="submit" disabled={!question.trim()} aria-label="Ask product assistant">
                Ask
              </button>
            </div>
            <span className="assistant-composer-foot">
              <span>Local product knowledge</span>
              <Link href="/cart">Cart · {cartUnits}</Link>
            </span>
          </form>
        </section>
      </div>
    </div>
  );
}

function AssistantAnswer({
  response,
  products,
  maintenanceMode,
  onApplyAction,
  onDirectAdd,
  onSuggestion,
}: {
  response: AssistantResponse;
  products: AssistantProduct[];
  maintenanceMode: boolean;
  onApplyAction?: (action: AssistantCartAction) => void;
  onDirectAdd: (product: AssistantProduct, variant: AssistantVariant, quantity: number) => void;
  onSuggestion: (question: string) => void;
}) {
  return (
    <div className="assistant-answer">
      <div className="assistant-answer-mark">
        <Image src="/spyguy-white.png" alt="" width={900} height={900} />
      </div>
      <div className="assistant-answer-body">
        <p className="assistant-direct-answer">{response.directAnswer}</p>
        {response.details.length ? (
          <ul className="assistant-detail-list">
            {response.details.map((detail, index) => <li key={`${detail}-${index}`}>{detail}</li>)}
          </ul>
        ) : null}

        {response.comparison ? (
          <div className="assistant-comparison-scroll" tabIndex={0} aria-label="Product comparison table">
            <table className="assistant-comparison">
              <thead>
                <tr>
                  <th scope="col">Difference</th>
                  {products.map((product) => <th scope="col" key={product.id}>{product.shortName}</th>)}
                </tr>
              </thead>
              <tbody>
                {response.comparison.rows.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {row.values.map((value, index) => <td key={`${row.label}-${index}`}>{value}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}

        {response.clarification?.options.length ? (
          <div className="assistant-option-row">
            {response.clarification.options.map((option) => (
              <button key={option} type="button" onClick={() => onSuggestion(`${response.clarification?.prompt ?? ""} ${option}`)}>{option}</button>
            ))}
          </div>
        ) : null}

        {products.length ? (
          <div className="assistant-product-grid">
            {products.map((product) => (
              <AssistantProductCard
                key={product.id}
                product={product}
                maintenanceMode={maintenanceMode}
                onAdd={onDirectAdd}
              />
            ))}
          </div>
        ) : null}

        {response.pendingAction && onApplyAction ? (
          <div className="assistant-confirm-action">
            <span>{response.pendingAction.label}</span>
            <button type="button" onClick={() => onApplyAction(response.pendingAction!)} disabled={maintenanceMode}>
              {maintenanceMode ? "Ordering paused" : "Confirm cart change"}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function AssistantProductCard({
  product,
  maintenanceMode,
  onAdd,
}: {
  product: AssistantProduct;
  maintenanceMode: boolean;
  onAdd: (product: AssistantProduct, variant: AssistantVariant, quantity: number) => void;
}) {
  const available = product.variants.filter((variant) => variant.status === "available" && !variant.hidden);
  const [variantId, setVariantId] = useState(available[0]?.id ?? product.variants[0]?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const variant = product.variants.find((entry) => entry.id === variantId) ?? available[0] ?? product.variants[0];

  if (!variant) return null;
  return (
    <article className="assistant-product-card">
      <Link href={`/products/${product.slug}`} className="assistant-product-image" aria-label={`View ${product.name} details`}>
        <Image
          src={variant.image || product.image || "/spyguy-white.png"}
          alt={`${product.name} ${variant.flavor}`}
          width={240}
          height={240}
          loading="lazy"
          sizes="(max-width: 600px) 38vw, 180px"
        />
      </Link>
      <div className="assistant-product-copy">
        <span className="assistant-product-status" data-status={variant.status}>
          {variant.status === "available" ? variant.runningLow ? "Running low" : "Available" : variant.status === "coming-soon" ? "Coming soon" : "Sold out"}
        </span>
        <Link href={`/products/${product.slug}`}><h3>{product.shortName}</h3></Link>
        <p>{product.retailerPitch}</p>
        <div className="assistant-price-line">
          <strong>{money(variant.wholesalePrice)}</strong>
          <span>MAP {money(variant.mapPrice)}</span>
          <span>{variant.marginPercent.toFixed(2)}% margin</span>
        </div>
        <label>
          <span>Flavor</span>
          <select value={variant.id} onChange={(event) => setVariantId(event.target.value)}>
            {product.variants.filter((entry) => !entry.hidden).map((entry) => (
              <option key={entry.id} value={entry.id} disabled={entry.status !== "available"}>
                {entry.flavor}{entry.status === "available" ? "" : entry.status === "coming-soon" ? " — Coming soon" : " — Sold out"}
              </option>
            ))}
          </select>
        </label>
        <div className="assistant-card-actions">
          <label>
            <span className="sr-only">Quantity for {product.shortName} {variant.flavor}</span>
            <input
              type="number"
              min="1"
              max="999"
              inputMode="numeric"
              value={quantity}
              onChange={(event) => setQuantity(clampQuantity(Number(event.target.value) || 1))}
            />
          </label>
          <button
            type="button"
            onClick={() => onAdd(product, variant, quantity)}
            disabled={maintenanceMode || variant.status !== "available"}
          >
            {maintenanceMode ? "Paused" : "Add"}
          </button>
        </div>
        <details>
          <summary>Formula details</summary>
          <ul>
            {product.formula.ingredients.slice(0, 12).map((ingredient) => (
              <li key={`${ingredient.normalizedName}-${ingredient.amount ?? "listed"}`}>
                <span>{ingredient.name}</span>
                <strong>{ingredient.amount === undefined ? "Listed" : `${ingredient.amount} ${ingredient.unit}`}</strong>
              </li>
            ))}
          </ul>
          {product.formula.verification === "needs-review" ? <small>Unconfirmed fields are intentionally omitted.</small> : null}
        </details>
      </div>
    </article>
  );
}

function readCart(): Record<string, number> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CART_KEY) || "{}") as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).flatMap(([id, value]) => {
      const quantity = clampQuantity(Number(value));
      return quantity > 0 ? [[id, quantity]] : [];
    }));
  } catch {
    return {};
  }
}

function writeCart(cart: Record<string, number>) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new CustomEvent("blackmarket:cart-updated", { detail: { source: "assistant" } }));
}

function clampQuantity(value: number): number {
  return Math.min(999, Math.max(0, Math.floor(Number(value) || 0)));
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}
