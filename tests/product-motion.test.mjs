import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
import test from "node:test";

const script = await readFile(new URL("../public/lib/disclosure-motion.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../public/styles-v3.css", import.meta.url), "utf8");
const motion = await readFile(new URL("../public/portal-motion.css", import.meta.url), "utf8");

function disclosure({ reduced = false, animated = true } = {}) {
  let click;
  const animations = [];
  const summary = { addEventListener: (type, handler) => { assert.equal(type, "click"); click = handler; } };
  const body = {
    scrollHeight: 120, getBoundingClientRect: () => ({ height: 60 }),
    animate: animated ? (frames, options) => {
      const animation = { frames, options, cancelled: false, cancel() { this.cancelled = true; } };
      animations.push(animation);
      return animation;
    } : undefined,
  };
  const details = { open: false, dataset: {}, querySelector: (selector) => selector === "summary" ? summary : body };
  const context = vm.createContext({ details, matchMedia: () => ({ matches: reduced }), getComputedStyle: () => ({ opacity: "1" }) });
  vm.runInContext(`${script.replace("export function", "function")}\nenhanceDisclosure(details);`, context);
  return { details, animations, click: () => click?.({ preventDefault() {} }) };
}

test("About uses native summary activation and animates both opening and closing", () => {
  const { details, animations, click } = disclosure();
  click();
  assert.equal(details.open, true);
  assert.equal(details.dataset.expanded, "true");
  assert.equal(animations[0].frames[0].height, "0px");
  assert.equal(animations[0].frames[1].height, "120px");
  animations[0].onfinish();
  click();
  assert.equal(details.open, true, "keep layout until closing animation finishes");
  assert.equal(details.dataset.expanded, "false");
  assert.equal(animations[1].frames[1].height, "0px");
  animations[1].onfinish();
  assert.equal(details.open, false);
});

test("rapid About toggles cancel stale completion handlers", () => {
  const { details, animations, click } = disclosure();
  click(); click(); click();
  assert.equal(animations[0].cancelled, true);
  assert.equal(animations[0].onfinish, null);
  assert.equal(animations[1].cancelled, true);
  animations[2].onfinish();
  assert.equal(details.open, true);
});

test("reduced motion toggles instantly and unsupported animation retains native details", () => {
  const reduced = disclosure({ reduced: true });
  reduced.click();
  assert.equal(reduced.details.open, true);
  reduced.click();
  assert.equal(reduced.details.open, false);
  assert.equal(reduced.animations.length, 0);
  const fallback = disclosure({ animated: false });
  fallback.click();
  assert.equal(fallback.animations.length, 0);
});

test("detail stepper is compact without shrinking 44px button targets", () => {
  assert.match(styles, /\.detail-actions \.qty-mini \{[^}]*width: min\(100%, 148px\)/);
  assert.match(styles, /\.detail-actions \.qty-mini button \{[^}]*min-height: 44px/);
  assert.match(styles, /\.detail-about summary \{[^}]*font-weight: 800/);
});

test("both route systems share glass motion without retaining fixed-position traps", async () => {
  const html = await readFile(new URL("../public/index.html", import.meta.url), "utf8");
  const reactCss = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.ok(html.includes('/portal-motion.css?v='));
  assert.ok(reactCss.includes('@import "../public/portal-motion.css"'));
  assert.match(motion, /animation: glass-content-in[^;]+backwards/);
  assert.match(motion, /body\.admin-pricing-editing #adminView \{ animation: none/);
  assert.match(motion, /prefers-reduced-motion: reduce/);
  assert.match(motion, /@view-transition \{ navigation: none/);
});
