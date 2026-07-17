"use client";

const HISTORY_KEY = "blackmarket-portal-route-history-v2";
const INDEX_KEY = "blackmarket-portal-route-index-v2";
export const PORTAL_HOME_PATH = "/";
export const PORTAL_HOME_CATEGORY = "thermogenics";

export interface PortalHistoryState {
  stack: string[];
  index: number;
}

export function portalHomeState() {
  return { path: PORTAL_HOME_PATH, view: "landing" as const, category: PORTAL_HOME_CATEGORY, query: "" };
}

export function accountDestination(authenticated: boolean): string {
  return authenticated ? "/account" : "/sign-in?next=/account";
}

export function signInBackGoesHome(pathname: string): boolean {
  return pathname === "/sign-in";
}

export function normalizePortalPath(value: string): string {
  try {
    const url = new URL(value, window.location.origin);
    return `${url.pathname}${url.search}${url.hash}` || "/products";
  } catch {
    return "/products";
  }
}

export function readPortalHistory(): PortalHistoryState {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]") as unknown;
    const stack = Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string" && entry.startsWith("/"))
      : [];
    const storedIndex = Number(sessionStorage.getItem(INDEX_KEY));
    const index = Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < stack.length
      ? storedIndex
      : Math.max(0, stack.length - 1);
    return { stack, index };
  } catch {
    return { stack: [], index: 0 };
  }
}

export function initializePortalHistory(path = currentPortalPath()): PortalHistoryState {
  const normalized = normalizePortalPath(path);
  const state = readPortalHistory();
  let stack = state.stack;
  let index = state.index;

  if (!stack.length) {
    stack = [normalized];
    index = 0;
  } else if (stack[index] !== normalized) {
    const existingIndex = stack.lastIndexOf(normalized);
    if (existingIndex >= 0 && Math.abs(existingIndex - index) === 1) {
      index = existingIndex;
    } else {
      stack = [...stack.slice(0, index + 1), normalized].slice(-40);
      index = stack.length - 1;
    }
  }

  writePortalHistory({ stack, index });
  markBrowserEntry(index);
  return { stack, index };
}

export function recordPortalNavigation(path: string): PortalHistoryState {
  const normalized = normalizePortalPath(path);
  const current = initializePortalHistory();
  if (current.stack[current.index] === normalized) return current;
  const stack = [...current.stack.slice(0, current.index + 1), normalized].slice(-40);
  const next = { stack, index: stack.length - 1 };
  writePortalHistory(next);
  return next;
}

export function safePortalBack(fallback: () => void): void {
  const current = initializePortalHistory();
  if (current.index > 0 && current.stack[current.index - 1]?.startsWith("/")) {
    writePortalHistory({ stack: current.stack, index: current.index - 1 });
    window.history.back();
    return;
  }
  fallback();
}

export function goHome(options: { replace?: boolean; onBeforeNavigate?: () => void } = {}): void {
  options.onBeforeNavigate?.();
  if (options.replace) {
    writePortalHistory({ stack: [PORTAL_HOME_PATH], index: 0 });
    window.location.replace(PORTAL_HOME_PATH);
    return;
  }
  recordPortalNavigation(PORTAL_HOME_PATH);
  window.location.assign(PORTAL_HOME_PATH);
}

export function currentPortalPath(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function writePortalHistory(state: PortalHistoryState): void {
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(state.stack));
  sessionStorage.setItem(INDEX_KEY, String(state.index));
}

function markBrowserEntry(index: number): void {
  const existing = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
  window.history.replaceState({ ...existing, blackmarketPortalIndex: index }, "", currentPortalPath());
}
