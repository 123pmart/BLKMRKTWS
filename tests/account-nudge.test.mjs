import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ACCOUNT_NUDGE_FIRST_LOAD,
  ACCOUNT_NUDGE_REPEAT_GAP,
  accountNudgeIsDue,
  nextAccountNudgeLoad,
  nextPortalLoad,
} from "../public/lib/account-nudge.js";

const portalHtml = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const portalApp = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const authPanel = await readFile(new URL("../app/components/account/auth-panel.tsx", import.meta.url), "utf8");

test("account prompt first becomes eligible on the second load", () => {
  assert.equal(ACCOUNT_NUDGE_FIRST_LOAD, 2);
  assert.equal(nextPortalLoad(null), 1);
  assert.equal(nextPortalLoad("1"), 2);
  assert.equal(accountNudgeIsDue(1), false);
  assert.equal(accountNudgeIsDue(2), true);
});

test("dismissal on load two defers the account prompt until load six", () => {
  assert.equal(ACCOUNT_NUDGE_REPEAT_GAP, 4);
  const nextLoad = nextAccountNudgeLoad(2);
  assert.equal(nextLoad, 6);
  assert.equal(accountNudgeIsDue(5, nextLoad), false);
  assert.equal(accountNudgeIsDue(6, nextLoad), true);
});

test("portal prompt links directly to account creation and has a dismissal control", () => {
  assert.match(portalHtml, /id="accountNudge"/);
  assert.match(portalHtml, /href="\/sign-in\?mode=register&amp;next=\/account"/);
  assert.match(portalHtml, /id="accountNudgeDismiss"/);
});

test("known and authenticated store accounts suppress future prompts", () => {
  assert.match(portalApp, /if \(state\.accountAuthenticated\) rememberStoreAccount\(\)/);
  assert.match(portalApp, /hasKnownStoreAccount\(\) \|\| isPortalMaintenanceMode\(\)/);
  assert.match(authPanel, /blackmarket-store-account-known-v1/);
  assert.match(authPanel, /search\.get\("mode"\) === "register"/);
});
