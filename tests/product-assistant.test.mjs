import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

import { PRODUCT_KNOWLEDGE } from "../app/lib/assistant/knowledge-data.ts";
import {
  answerAssistantQuestion,
  detectAssistantIntent,
  resolveAssistantEntities,
} from "../app/lib/assistant/engine.ts";
import { ASSISTANT_QUESTION_LIBRARY } from "../app/lib/assistant/question-library.ts";

const rawCatalog = JSON.parse(await readFile(new URL("../public/catalog-data.json", import.meta.url), "utf8"));
const rawById = new Map(rawCatalog.products.map((product) => [product.id, product]));

const products = PRODUCT_KNOWLEDGE.map((knowledge) => {
  const raw = rawById.get(knowledge.productId);
  const variants = (raw?.variants || []).map((variant) => ({
    id: variant.id,
    productId: raw?.id || knowledge.productId,
    flavor: variant.flavor,
    item: variant.item,
    upc: variant.upc || "",
    image: variant.cardImage || variant.bottle || raw?.bottle || "",
    wholesalePrice: variant.wholesaleValue,
    standardWholesalePrice: variant.wholesaleValue,
    mapPrice: variant.mapValue,
    marginPercent: ((variant.mapValue - variant.wholesaleValue) / variant.mapValue) * 100,
    status: variant.id === "defy-hyper-stimulant-white-gummy-bear-56298" || variant.id === "rule-hyper-focus-purge-pop-56299" ? "sold-out" : "available",
    limited: Boolean(variant.limitedEdition),
    runningLow: false,
    hidden: variant.id === "defy-hyper-stimulant-white-gummy-bear-56298",
  }));
  if (knowledge.productId === "rule-hyper-focus") {
    variants.push({
      id: "extension-rule-hyper-focus-dragon-punch-1783533527232-dragon-punch",
      productId: "extension-rule-hyper-focus-dragon-punch-1783533527232",
      flavor: "Dragon Punch",
      item: "56330",
      upc: "",
      image: raw?.bottle || "",
      wholesalePrice: 28,
      standardWholesalePrice: 28,
      mapPrice: 59.99,
      marginPercent: ((59.99 - 28) / 59.99) * 100,
      status: "available",
      limited: true,
      runningLow: false,
      hidden: false,
    });
  }
  return {
    id: knowledge.productId,
    name: raw?.title || knowledge.shortName,
    shortName: knowledge.shortName,
    slug: raw?.handle || knowledge.productId,
    category: raw?.category || "Products",
    categorySlug: raw?.categorySlug || "products",
    image: raw?.bottle || "",
    aliases: knowledge.aliases,
    commonMisspellings: knowledge.commonMisspellings || [],
    purpose: knowledge.purpose,
    retailerPitch: knowledge.retailerPitch,
    bestFor: knowledge.bestFor,
    notIdealFor: knowledge.notIdealFor,
    keyDifferentiators: knowledge.keyDifferentiators,
    goals: knowledge.goals,
    formula: knowledge.formula,
    relationships: knowledge.relationships,
    approvedFaqs: knowledge.approvedFaqs || [],
    prohibitedClaims: knowledge.prohibitedClaims,
    sources: knowledge.sources,
    verification: knowledge.verification,
    variants,
  };
});

test("question library contains at least 150 structured wholesale questions", () => {
  assert.ok(ASSISTANT_QUESTION_LIBRARY.length >= 150, `expected >= 150, received ${ASSISTANT_QUESTION_LIBRARY.length}`);
  for (const fixture of ASSISTANT_QUESTION_LIBRARY) {
    assert.ok(fixture.question);
    assert.ok(fixture.expectedIntent);
    assert.ok(Array.isArray(fixture.expectedProductIds));
    assert.ok(fixture.requiredFacts.length);
    assert.ok(fixture.unacceptableClaims.length);
    assert.ok(fixture.expectedResponseType);
  }
});

test("every fixture reaches its expected deterministic intent", () => {
  for (const fixture of ASSISTANT_QUESTION_LIBRARY) {
    const entities = resolveAssistantEntities(fixture.question, products);
    assert.equal(
      detectAssistantIntent(fixture.question, entities.products.length),
      fixture.expectedIntent,
      fixture.question,
    );
  }
});

test("recognizes exact names, aliases, misspellings, and suppresses ingredient products in ingredient questions", () => {
  assert.deepEqual(resolveAssistantEntities("Compare BULK and BULK APEX", products).products.map((product) => product.id), [
    "bulk-testosterone-pre-workout",
    "bulk-apex-strength-pre-workout",
  ]);
  assert.equal(resolveAssistantEntities("Tell me about beta alinine", products).products[0]?.id, "beta-alanine-raw");
  assert.deepEqual(resolveAssistantEntities("Does BULK APEX contain creatine?", products).products.map((product) => product.id), [
    "bulk-apex-strength-pre-workout",
  ]);
});

test("product comparisons lead with a concise positioning difference", () => {
  const response = answerAssistantQuestion("What is the difference between DEFY and RULE?", products);
  assert.equal(response.intent, "compare_products");
  assert.equal(response.responseType, "comparison");
  assert.match(response.directAnswer, /DEFY is .*; RULE is .*\./);
  assert.ok(response.details.length <= 2);
  assert.deepEqual(response.productIds, ["defy-hyper-stimulant", "rule-hyper-focus"]);
});

test("CUTS and BULK comparison leads with thermogenic versus strength positioning", () => {
  const response = answerAssistantQuestion("What is the difference between CUTS and BULK?", products);
  assert.equal(
    response.directAnswer,
    "CUTS is a thermogenic-focused product; BULK is a strength-focused product.",
  );
  assert.match(response.details[0], /300 mg caffeine/i);
  assert.match(response.details[1], /creatine/i);
});

test("formula detail appears when the buyer explicitly asks for it", () => {
  const response = answerAssistantQuestion("Compare the exact formula and ingredients in DEFY and RULE", products);
  assert.match(response.details.join(" "), /mg total caffeine/);
  assert.match(response.details.join(" "), /Beta-Alanine/);
});

test("ranks caffeine without inventing BUMP total", () => {
  const response = answerAssistantQuestion("Which product has the most caffeine?", products);
  assert.equal(response.productIds[0], "rule-hyper-focus");
  assert.doesNotMatch(response.directAnswer, /BUMP/);
  assert.equal(products.find((product) => product.id === "bump-laser-focus-nootropic").formula.totalCaffeineMg, undefined);
});

test("finds ingredients across products instead of treating ingredient RAW products as the only result", () => {
  const response = answerAssistantQuestion("Which products contain creatine?", products);
  assert.ok(response.productIds.includes("bulk-testosterone-pre-workout"));
  assert.ok(response.productIds.includes("bulk-apex-strength-pre-workout"));
  assert.ok(response.productIds.includes("creatine-monohydrate-raw"));
  assert.ok(response.details.some((detail) => /5 g/.test(detail)));
});

test("only confirms ingredient exclusions for verified formulas", () => {
  const response = answerAssistantQuestion("Which products do not contain yohimbine?", products);
  assert.equal(response.intent, "exclude_ingredient");
  assert.ok(response.productIds.includes("bulk-testosterone-pre-workout"));
  assert.ok(response.details.includes("Products with proprietary or incomplete ingredient lists are omitted from exclusion results."));
});

test("returns verified stimulant-free products", () => {
  const response = answerAssistantQuestion("Which products are stimulant free?", products);
  assert.equal(response.intent, "find_stimulant_free");
  assert.ok(response.productIds.includes("pump-hyper-pump-pre-workout"));
  assert.ok(response.productIds.includes("nitricoxide-stim-free-pre-workout"));
  assert.ok(!response.productIds.includes("defy-hyper-stimulant"));
});

test("uses current prices and calculates MAP margin", () => {
  const response = answerAssistantQuestion("What is the margin for BULK PILLS?", products);
  assert.equal(response.intent, "calculate_margin");
  assert.match(response.details[0], /\$23\.00 wholesale/);
  assert.match(response.details[0], /67\.14% MAP margin/);
});

test("flavor response includes sold-out and available statuses", () => {
  const response = answerAssistantQuestion("What flavors are available for RULE?", products);
  assert.ok(response.details.some((detail) => /Dragon Punch: Available/.test(detail)));
  assert.ok(response.details.some((detail) => /Purge Pop: Sold out/.test(detail)));
});

test("follow-up context resolves pronouns", () => {
  const first = answerAssistantQuestion("Compare DEFY and RULE", products);
  const followup = answerAssistantQuestion("Which one has more caffeine?", products, { context: first.nextContext });
  assert.equal(followup.intent, "rank_by_caffeine");
  assert.equal(followup.productIds[0], "rule-hyper-focus");
});

test("cart action resolves Dragon Punch and quantity without mutating automatically", () => {
  const response = answerAssistantQuestion("Add six RULE Dragon Punch to my cart", products, { cart: {} });
  assert.equal(response.responseType, "cart-action");
  assert.equal(response.pendingAction?.updates[0].quantity, 6);
  assert.equal(response.pendingAction?.updates[0].variantId, "extension-rule-hyper-focus-dragon-punch-1783533527232-dragon-punch");
});

test("ambiguous multi-flavor add asks for a flavor", () => {
  const response = answerAssistantQuestion("Add 2 DEFY units to my cart", products, { cart: {} });
  assert.equal(response.responseType, "clarification");
  assert.match(response.directAnswer, /Which DEFY flavor/);
});

test("remove, quantity update, and cart totals use stable variant IDs", () => {
  const cuts = products.find((product) => product.id === "cuts-thermogenic-pre-workout");
  const variant = cuts.variants[0];
  const cart = { [variant.id]: 4 };
  const update = answerAssistantQuestion(`Set ${cuts.shortName} ${variant.flavor} quantity to 7`, products, { cart });
  assert.equal(update.pendingAction?.updates[0].mode, "set");
  assert.equal(update.pendingAction?.updates[0].quantity, 7);
  const remove = answerAssistantQuestion(`Remove ${cuts.shortName} ${variant.flavor} from my cart`, products, { cart });
  assert.equal(remove.pendingAction?.updates[0].mode, "remove");
  const summary = answerAssistantQuestion("Summarize my cart", products, { cart });
  assert.match(summary.directAnswer, /4 units/);
  assert.match(summary.directAnswer, /\$96\.00 wholesale/);
});

test("case requests do not invent case quantities", () => {
  const response = answerAssistantQuestion("Add one case of each RULE flavor", products, { cart: {} });
  assert.equal(response.responseType, "unsupported");
  assert.match(response.directAnswer, /Case quantities are not included/);
});

test("unknown and medical questions never produce unsupported formula or medical claims", () => {
  const unknown = answerAssistantQuestion("Will this cure a medical condition?", products);
  assert.equal(unknown.responseType, "unsupported");
  assert.match(unknown.directAnswer, /built specifically for BlackMarketLabs/);
  const medical = answerAssistantQuestion("Is DEFY safe for high blood pressure?", products);
  assert.doesNotMatch(`${medical.directAnswer} ${medical.details.join(" ")}`, /\bsafe for\b.*high blood pressure/i);
});

test("handles greetings, capabilities, general product education, and outside brands conversationally", () => {
  assert.equal(answerAssistantQuestion("Hi", products).directAnswer, "Hey — how can I help you with the BlackMarketLabs lineup?");
  assert.match(answerAssistantQuestion("What can you do?", products).directAnswer, /compare formulas/i);
  assert.match(answerAssistantQuestion("What is a thermogenic?", products).directAnswer, /cutting category/i);
  assert.match(answerAssistantQuestion("Tell me about C4", products).directAnswer, /built specifically for BlackMarketLabs/i);
});

test("owner-supplied product guide corrections are represented exactly", () => {
  const defy = products.find((product) => product.id === "defy-hyper-stimulant");
  const rule = products.find((product) => product.id === "rule-hyper-focus");
  const underground = products.find((product) => product.id === "underground-high-stimulant");
  const nootropic = products.find((product) => product.id === "nootropic-high-focus-pre-workout");
  const fit = products.find((product) => product.id === "fit-performance-pre-workout");
  assert.equal(defy.formula.ingredients.find((item) => item.name === "Mucuna Pruriens").amount, 150);
  assert.equal(defy.formula.ingredients.find((item) => item.name === "Eria Jarensis").amount, 300);
  assert.equal(rule.formula.ingredients.find((item) => item.name === "Mucuna Pruriens").amount, 350);
  assert.equal(rule.formula.ingredients.find((item) => item.name === "Bitter Orange Extract").amount, 100);
  assert.equal(underground.formula.totalCaffeineMg, 300);
  assert.equal(nootropic.formula.ingredients.find((item) => item.name === "Lion's Mane").amount, 600);
  assert.equal(fit.formula.totalCaffeineMg, 200);
  assert.equal(fit.variants.length, 0);
});
