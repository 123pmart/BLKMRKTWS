import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ACCOUNT_NUDGE_DISABLED_LOAD,
  ACCOUNT_NUDGE_FIRST_LOAD,
  ACCOUNT_NUDGE_SECOND_LOAD,
  accountNudgeIsDue,
  nextAccountNudgeLoad,
  nextPortalLoad,
} from "../public/lib/account-nudge.js";

const portalHtml = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
const portalApp = await readFile(new URL("../public/app.js", import.meta.url), "utf8");
const authPanel = await readFile(new URL("../app/components/account/auth-panel.tsx", import.meta.url), "utf8");

test("account prompt first becomes eligible only on the fifth load", () => {
  assert.equal(ACCOUNT_NUDGE_FIRST_LOAD, 5);
  assert.equal(nextPortalLoad(null), 1);
  assert.equal(nextPortalLoad("4"), 5);
  assert.equal(accountNudgeIsDue(4), false);
  assert.equal(accountNudgeIsDue(5), true);
});

test("the fifth-load impression advances once to load ten and then stops", () => {
  assert.equal(ACCOUNT_NUDGE_SECOND_LOAD, 10);
  const secondLoad = nextAccountNudgeLoad(5);
  assert.equal(secondLoad, 10);
  assert.equal(accountNudgeIsDue(9, secondLoad), false);
  assert.equal(accountNudgeIsDue(10, secondLoad), true);
  assert.equal(nextAccountNudgeLoad(10), ACCOUNT_NUDGE_DISABLED_LOAD);
  assert.equal(accountNudgeIsDue(11, ACCOUNT_NUDGE_DISABLED_LOAD), false);
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

test("admin session resolution suppresses and cancels the account prompt", () => {
  assert.match(portalApp, /!state\.adminResolved/);
  assert.match(portalApp, /if \(state\.adminAuthed\) \{\s*hideAccountNudge\(\)/);
  assert.match(portalApp, /state\.adminIdentity = result\.identity \|\| null;\s*hideAccountNudge\(\)/);
});

test("the reduced cadence uses fresh storage keys instead of inheriting the old frequent schedule", () => {
  assert.match(portalApp, /blackmarket-account-nudge-loads-v2/);
  assert.match(portalApp, /blackmarket-account-nudge-next-v2/);
});
