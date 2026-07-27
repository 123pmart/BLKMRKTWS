import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PRODUCT_KNOWLEDGE } from "../app/lib/assistant/knowledge-data.ts";
import { answerAssistantQuestion } from "../app/lib/assistant/engine.ts";
import { KNOWLEDGE } from "../knowledge/exports/knowledge.generated.ts";
import type { AssistantProduct } from "../app/lib/assistant/types.ts";

const root = process.cwd();
const rawCatalog = JSON.parse(await readFile(path.join(root, "public/catalog-data.json"), "utf8")) as {
  products: Array<{
    id: string;
    title: string;
    handle?: string;
    category?: string;
    categorySlug?: string;
    bottle?: string;
    variants?: Array<{
      id: string;
      flavor: string;
      item: string;
      upc?: string;
      cardImage?: string;
      bottle?: string;
      wholesaleValue: number;
      mapValue: number;
      limitedEdition?: boolean;
    }>;
  }>;
};
const rawById = new Map(rawCatalog.products.map((product) => [product.id, product]));
const products: AssistantProduct[] = PRODUCT_KNOWLEDGE.map((record) => {
  const raw = rawById.get(record.productId);
  const variants = (raw?.variants ?? []).map((variant) => ({
    id: variant.id,
    productId: raw?.id ?? record.productId,
    flavor: variant.flavor,
    item: variant.item,
    upc: variant.upc ?? "",
    image: variant.cardImage ?? variant.bottle ?? raw?.bottle ?? "",
    wholesalePrice: variant.wholesaleValue,
    standardWholesalePrice: variant.wholesaleValue,
    mapPrice: variant.mapValue,
    marginPercent: variant.mapValue > 0 ? ((variant.mapValue - variant.wholesaleValue) / variant.mapValue) * 100 : 0,
    status: variant.id === "defy-hyper-stimulant-white-gummy-bear-56298" || variant.id === "rule-hyper-focus-purge-pop-56299" ? "sold-out" as const : "available" as const,
    limited: Boolean(variant.limitedEdition),
    runningLow: false,
    hidden: variant.id === "defy-hyper-stimulant-white-gummy-bear-56298",
  }));
  return {
    id: record.productId,
    name: raw?.title ?? record.shortName,
    shortName: record.shortName,
    slug: raw?.handle ?? record.productId,
    category: raw?.category ?? "Products",
    categorySlug: raw?.categorySlug ?? "products",
    image: raw?.bottle ?? "",
    aliases: record.aliases,
    commonMisspellings: record.commonMisspellings ?? [],
    purpose: record.purpose,
    retailerPitch: record.retailerPitch,
    bestFor: record.bestFor,
    notIdealFor: record.notIdealFor,
    keyDifferentiators: record.keyDifferentiators,
    goals: record.goals,
    formula: record.formula,
    relationships: record.relationships,
    approvedFaqs: record.approvedFaqs ?? [],
    prohibitedClaims: record.prohibitedClaims,
    sources: record.sources,
    verification: record.verification,
    variants,
  };
});

const results = KNOWLEDGE.benchmarks.map((benchmark) => {
  const response = answerAssistantQuestion(benchmark.question, products);
  const answerText = normalize([
    response.directAnswer,
    ...response.details,
    ...(response.sections?.flatMap((section) => [section.heading, ...section.paragraphs]) ?? []),
  ].join(" "));
  const missingProducts = benchmark.expectedProductIds.filter((id) => !response.productIds.includes(id));
  const missingFacts = benchmark.requiredFacts.filter((fact) => !answerText.includes(normalize(fact)));
  const forbiddenHits = benchmark.forbiddenClaims.filter((claim) => answerText.includes(normalize(claim)));
  const intentMatch = response.intent === benchmark.expectedIntent;
  return {
    id: benchmark.id,
    question: benchmark.question,
    pass: intentMatch && !missingProducts.length && !missingFacts.length && !forbiddenHits.length,
    expectedIntent: benchmark.expectedIntent,
    actualIntent: response.intent,
    missingProducts,
    missingFacts,
    forbiddenHits,
    responseType: response.responseType,
  };
});

const failed = results.filter((result) => !result.pass);
const spotChecks = [
  {
    id: "spot-cuts-vs-bulk",
    question: "What's the difference between CUTS and BULK?",
    requiredFacts: ["thermogenic", "strength", "creatine", "300 mg", "proprietary"],
  },
  {
    id: "spot-cuts-vs-tone",
    question: "CUTS vs TONE",
    requiredFacts: ["thermogenic", "women", "CLA", "antioxidant", "300 mg", "proprietary"],
  },
  {
    id: "spot-defy-vs-rule",
    question: "DEFY vs RULE",
    requiredFacts: ["10 g L-Citrulline", "5 g Betaine", "3 g L-Tyrosine", "Uridine", "Lion's Mane"],
  },
].map((spotCheck) => {
  const response = answerAssistantQuestion(spotCheck.question, products);
  const visibleText = [
    response.directAnswer,
    ...(response.sections?.length ? [] : response.details),
    ...(response.sections
      ?.filter((section) => !section.expandable)
      .flatMap((section) => [section.heading, ...section.paragraphs]) ?? []),
  ].join(" ");
  const normalizedVisibleText = normalize(visibleText);
  const missingFacts = spotCheck.requiredFacts.filter((fact) => !normalizedVisibleText.includes(normalize(fact)));
  const wordCount = visibleText.trim().split(/\s+/).filter(Boolean).length;
  return {
    ...spotCheck,
    pass: !missingFacts.length && wordCount >= 150 && wordCount <= 650,
    missingFacts,
    wordCount,
    answer: visibleText,
  };
});
const failedSpotChecks = spotChecks.filter((spotCheck) => !spotCheck.pass);
const report = {
  generatedAt: new Date().toISOString(),
  total: results.length,
  passed: results.length - failed.length,
  failed: failed.length,
  passRate: Math.round(((results.length - failed.length) / results.length) * 10_000) / 100,
  failures: failed,
  spotChecks,
};

await writeFile(path.join(root, "knowledge/exports/benchmark-results.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
if (failed.length || failedSpotChecks.length) process.exitCode = 1;

function normalize(value: string): string {
  return value.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}
