"use client";

import { FormEvent, useEffect, useRef, useState } from "react";

import { answerAssistantQuestion } from "@/lib/assistant/engine";
import type {
  AssistantCartAction,
  AssistantContext,
  AssistantProduct,
  AssistantResponse,
} from "@/lib/assistant/types";

const CART_KEY = "blackmarket-wholesale-cart-v4";

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
  maintenanceMode,
}: {
  products: AssistantProduct[];
  maintenanceMode: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [context, setContext] = useState<AssistantContext>({ productIds: [], variantIds: [] });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [undo, setUndo] = useState<UndoState | null>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const hydrateCart = () => setCart(readCart());
    const timer = window.setTimeout(hydrateCart, 0);
    window.addEventListener("storage", hydrateCart);
    window.addEventListener("blackmarket:cart-updated", hydrateCart);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("storage", hydrateCart);
      window.removeEventListener("blackmarket:cart-updated", hydrateCart);
    };
  }, []);

  useEffect(() => {
    const conversation = conversationRef.current;
    if (conversation) conversation.scrollTop = conversation.scrollHeight;
  }, [turns]);

  function ask(nextQuestion: string) {
    const clean = nextQuestion.trim();
    if (!clean) return;
    const response = answerAssistantQuestion(clean, products, { context, cart });
    setTurns((current) => [...current, { id: `${response.id}-${current.length}`, question: clean, response }]);
    if (response.nextContext.productIds.length || response.nextContext.variantIds.length) setContext(response.nextContext);
    setQuestion("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    ask(question);
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
            directAnswer: `${action.label}. Your cart is updated.`,
            details: [],
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

  const active = turns.length > 0;

  return (
    <section className={`assistant-chat${active ? " has-conversation" : ""}`} aria-labelledby="assistant-title">
      <header className="assistant-chat-title">
        <h1 id="assistant-title">BLACKMARKET AI</h1>
      </header>

      {active ? (
        <div className="assistant-turns" ref={conversationRef} role="log" aria-live="polite">
          {turns.map((turn, index) => (
            <article className="assistant-turn" key={turn.id}>
              <p className="assistant-question">{turn.question}</p>
              <AssistantAnswer
                question={turn.question}
                response={turn.response}
                maintenanceMode={maintenanceMode}
                onApplyAction={index === turns.length - 1 ? applyAction : undefined}
                onSuggestion={ask}
              />
            </article>
          ))}
        </div>
      ) : null}

      {undo ? (
        <div className="assistant-undo" role="status">
          <span>Cart updated</span>
          <button type="button" onClick={undoLastAction}>Undo</button>
        </div>
      ) : null}

      <form className="assistant-composer" onSubmit={submit}>
        <label className="sr-only" htmlFor="assistant-question">Ask BLACKMARKET AI</label>
        <input
          id="assistant-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask about a product..."
          autoComplete="off"
          enterKeyHint="send"
        />
        <button type="submit" disabled={!question.trim()} aria-label="Send question">
          <SendIcon />
        </button>
      </form>

      {maintenanceMode ? <p className="assistant-chat-status">Product questions are available. Ordering is paused.</p> : null}
    </section>
  );
}

function AssistantAnswer({
  question,
  response,
  maintenanceMode,
  onApplyAction,
  onSuggestion,
}: {
  question: string;
  response: AssistantResponse;
  maintenanceMode: boolean;
  onApplyAction?: (action: AssistantCartAction) => void;
  onSuggestion: (question: string) => void;
}) {
  const details = visibleDetails(question, response);

  return (
    <div className="assistant-answer">
      <span className="assistant-answer-label">BLACKMARKET AI</span>
      <p className="assistant-direct-answer">{response.directAnswer}</p>

      {details.length ? (
        <div className="assistant-answer-details">
          {details.map((detail, index) => <p key={`${detail}-${index}`}>{detail}</p>)}
        </div>
      ) : null}

      {response.clarification?.options.length ? (
        <div className="assistant-option-row">
          {response.clarification.options.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onSuggestion(`${response.clarification?.prompt ?? ""} ${option}`)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}

      {response.pendingAction && onApplyAction ? (
        <div className="assistant-confirm-action">
          <span>{response.pendingAction.label}</span>
          <button type="button" onClick={() => onApplyAction(response.pendingAction!)} disabled={maintenanceMode}>
            {maintenanceMode ? "Ordering paused" : "Confirm"}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function visibleDetails(question: string, response: AssistantResponse): string[] {
  const asksForDetail = /\b(formula|ingredient|ingredients|dosage|dosages|dose|doses|serving|breakdown|break down|exact|detail|details)\b/i.test(question);
  if (asksForDetail) return response.details.slice(0, 10);
  if (response.responseType === "clarification" || response.responseType === "cart-action") return response.details.slice(0, 2);
  if (response.intent === "compare_products") return response.details.slice(0, 2);
  if ([
    "show_flavors",
    "show_stock",
    "show_new_products",
    "show_pricing",
    "calculate_margin",
    "find_by_ingredient",
    "exclude_ingredient",
    "find_stimulant_free",
    "rank_by_caffeine",
  ].includes(response.intent)) {
    return response.details.slice(0, 8);
  }
  return response.details.slice(0, 3);
}

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="m5 12 14-7-4.7 14-2.8-5.5L5 12Z" />
      <path d="m11.5 13.5 3-3" />
    </svg>
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
