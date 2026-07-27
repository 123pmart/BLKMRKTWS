"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

import type {
  AssistantCartAction,
  AssistantContext,
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
  maintenanceMode,
  adminPreview = false,
}: {
  maintenanceMode: boolean;
  adminPreview?: boolean;
}) {
  const [question, setQuestion] = useState("");
  const [turns, setTurns] = useState<ConversationTurn[]>([]);
  const [context, setContext] = useState<AssistantContext>({ productIds: [], variantIds: [] });
  const [cart, setCart] = useState<Record<string, number>>({});
  const [undo, setUndo] = useState<UndoState | null>(null);
  const [loading, setLoading] = useState(false);
  const [requestError, setRequestError] = useState("");
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

  async function ask(nextQuestion: string) {
    const clean = nextQuestion.trim();
    if (!clean || loading) return;
    setLoading(true);
    setRequestError("");
    setQuestion("");
    try {
      const result = await fetch("/api/assistant/answer", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: clean, context, cart }),
      });
      const payload = await result.json() as { response?: AssistantResponse; error?: string };
      if (!result.ok || !payload.response) throw new Error(payload.error || "BLACKMARKET AI could not answer that question.");
      const response = payload.response;
      setTurns((current) => [...current, { id: `${response.id}-${current.length}`, question: clean, response }]);
      if (response.nextContext.productIds.length || response.nextContext.variantIds.length) setContext(response.nextContext);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "BLACKMARKET AI could not answer that question.");
    } finally {
      setLoading(false);
    }
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
        {adminPreview ? <span className="assistant-preview-badge">Admin preview · Hidden from customers</span> : null}
      </header>

      {active ? (
        <div className="assistant-turns" ref={conversationRef} role="log" aria-live="polite">
          {turns.map((turn, index) => (
            <article className="assistant-turn" key={turn.id}>
              <p className="assistant-question">{turn.question}</p>
              <AssistantAnswer
                key={turn.response.directAnswer}
                question={turn.question}
                response={turn.response}
                animate={index === turns.length - 1}
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

      {loading ? <p className="assistant-thinking" role="status">Reviewing formulas…</p> : null}
      {requestError ? <p className="assistant-request-error" role="alert">{requestError}</p> : null}

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
        <button type="submit" disabled={!question.trim() || loading} aria-label="Send question">
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
  animate,
  maintenanceMode,
  onApplyAction,
  onSuggestion,
}: {
  question: string;
  response: AssistantResponse;
  animate: boolean;
  maintenanceMode: boolean;
  onApplyAction?: (action: AssistantCartAction) => void;
  onSuggestion: (question: string) => void;
}) {
  const details = visibleDetails(question, response);
  const [answerComplete, setAnswerComplete] = useState(!animate);
  const completeAnswer = useCallback(() => setAnswerComplete(true), []);

  return (
    <div className="assistant-answer">
      <span className="assistant-answer-label">BLACKMARKET AI</span>
      <StreamingText
        className="assistant-direct-answer"
        text={response.directAnswer}
        animate={animate}
        onComplete={completeAnswer}
      />

      {answerComplete && response.sections?.length ? (
        <div className="assistant-answer-sections">
          {response.sections.map((section) => section.expandable ? (
            <details className="assistant-answer-section assistant-answer-section-expandable" key={section.heading}>
              <summary>{section.heading}</summary>
              {section.paragraphs.map((paragraph, index) => <p key={`${section.heading}-${index}`}>{paragraph}</p>)}
            </details>
          ) : (
            <section className="assistant-answer-section" key={section.heading}>
              <h2>{section.heading}</h2>
              {section.paragraphs.map((paragraph, index) => <p key={`${section.heading}-${index}`}>{paragraph}</p>)}
            </section>
          ))}
        </div>
      ) : answerComplete && details.length ? (
        <div className="assistant-answer-details">
          {details.map((detail, index) => <p key={`${detail}-${index}`}>{detail}</p>)}
        </div>
      ) : null}

      {answerComplete && response.clarification?.options.length ? (
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

      {answerComplete && response.pendingAction && onApplyAction ? (
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

function StreamingText({
  text,
  animate,
  className,
  onComplete,
}: {
  text: string;
  animate: boolean;
  className: string;
  onComplete: () => void;
}) {
  const [visibleLength, setVisibleLength] = useState(animate ? 0 : text.length);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!animate) {
      return;
    }
    if (reducedMotion) {
      const reducedMotionTimer = window.setTimeout(() => {
        setVisibleLength(text.length);
        onComplete();
      }, 0);
      return () => window.clearTimeout(reducedMotionTimer);
    }

    let currentLength = 0;
    let interval = 0;
    const charactersPerTick = Math.max(1, Math.ceil(text.length / 110));
    const delay = window.setTimeout(() => {
      interval = window.setInterval(() => {
        currentLength = Math.min(text.length, currentLength + charactersPerTick);
        setVisibleLength(currentLength);
        if (currentLength >= text.length) {
          window.clearInterval(interval);
          onComplete();
        }
      }, 14);
    }, 160);

    return () => {
      window.clearTimeout(delay);
      window.clearInterval(interval);
    };
  }, [animate, onComplete, text]);

  const typing = visibleLength < text.length;
  return (
    <p className={className} aria-label={text}>
      <span aria-hidden="true">{text.slice(0, visibleLength)}</span>
      {typing ? <span className="assistant-stream-cursor" aria-hidden="true" /> : null}
    </p>
  );
}

function visibleDetails(question: string, response: AssistantResponse): string[] {
  void question;
  return response.details;
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
