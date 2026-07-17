const HISTORY_KEY = "blackmarket-portal-route-history-v2";
const INDEX_KEY = "blackmarket-portal-route-index-v2";

export function normalizePortalPath(value) {
  try {
    const url = new URL(value, window.location.origin);
    return `${url.pathname}${url.search}${url.hash}` || "/products";
  } catch {
    return "/products";
  }
}

export function readPortalHistory() {
  try {
    const parsed = JSON.parse(sessionStorage.getItem(HISTORY_KEY) || "[]");
    const stack = Array.isArray(parsed) ? parsed.filter((entry) => typeof entry === "string" && entry.startsWith("/")) : [];
    const storedIndex = Number(sessionStorage.getItem(INDEX_KEY));
    const index = Number.isInteger(storedIndex) && storedIndex >= 0 && storedIndex < stack.length
      ? storedIndex
      : Math.max(0, stack.length - 1);
    return { stack, index };
  } catch {
    return { stack: [], index: 0 };
  }
}

export function initializePortalHistory(path = currentPortalPath()) {
  const normalized = normalizePortalPath(path);
  const state = readPortalHistory();
  let { stack, index } = state;

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

export function recordPortalNavigation(path) {
  const normalized = normalizePortalPath(path);
  const current = initializePortalHistory();
  if (current.stack[current.index] === normalized) return current;
  const stack = [...current.stack.slice(0, current.index + 1), normalized].slice(-40);
  const next = { stack, index: stack.length - 1 };
  writePortalHistory(next);
  return next;
}

export function safePortalBack(fallback) {
  const current = initializePortalHistory();
  if (current.index > 0 && current.stack[current.index - 1]?.startsWith("/")) {
    writePortalHistory({ stack: current.stack, index: current.index - 1 });
    window.history.back();
    return;
  }
  fallback();
}

export function currentPortalPath() {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function writePortalHistory(state) {
  sessionStorage.setItem(HISTORY_KEY, JSON.stringify(state.stack));
  sessionStorage.setItem(INDEX_KEY, String(state.index));
}

function markBrowserEntry(index) {
  const existing = window.history.state && typeof window.history.state === "object" ? window.history.state : {};
  window.history.replaceState({ ...existing, blackmarketPortalIndex: index }, "", currentPortalPath());
}
