import assert from "node:assert/strict";
import test from "node:test";

import {
  accountDestination,
  portalHomeState,
  safePortalBack,
  signInBackGoesHome,
} from "../public/lib/portal-history.js";

test("Home always resolves to the initial product state", () => {
  assert.deepEqual(portalHomeState(), {
    path: "/",
    view: "landing",
    category: "thermogenics",
    query: "",
  });
});

test("sign-in Back policy always returns Home", () => {
  assert.equal(signInBackGoesHome("/sign-in"), true);
  assert.equal(signInBackGoesHome("/sign-in?next=/account"), true);
  assert.equal(signInBackGoesHome("/account"), false);
});

test("Account destination avoids a redirect while logged out", () => {
  assert.equal(accountDestination(false), "/sign-in?next=/account");
  assert.equal(accountDestination(true), "/account");
});

test("mobile Back falls back safely when there is no internal entry", () => {
  const storage = new Map();
  const previousWindow = globalThis.window;
  const previousSessionStorage = globalThis.sessionStorage;
  let browserBacks = 0;
  let fallbacks = 0;
  globalThis.sessionStorage = {
    getItem: (key) => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  };
  globalThis.window = {
    location: { origin: "https://portal.test", pathname: "/account", search: "", hash: "" },
    history: {
      state: {},
      replaceState(state) { this.state = state; },
      back() { browserBacks += 1; },
    },
  };
  try {
    safePortalBack(() => { fallbacks += 1; });
    assert.equal(fallbacks, 1);
    assert.equal(browserBacks, 0);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousSessionStorage === undefined) delete globalThis.sessionStorage;
    else globalThis.sessionStorage = previousSessionStorage;
  }
});
