import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { CanonicalKnowledge } from "../app/lib/assistant/canonical-types.ts";

const root = process.cwd();
const knowledgePath = path.join(root, "knowledge/exports/knowledge.json");
const knowledge = JSON.parse(await readFile(knowledgePath, "utf8")) as CanonicalKnowledge;

const findings = knowledge.products.map((product) => {
  const unknownAmounts = product.fullServing.filter((ingredient) => ingredient.amountStatus !== "exact");
  const unavailable = product.flavors.filter((variant) => variant.stockStatus !== "available" || variant.visibility === "hidden");
  const missing: string[] = [];
  if (!product.servingSize) missing.push("serving size");
  if (!product.servingsPerContainer) missing.push("servings per container");
  if (!product.fullServing.length) missing.push("formula");
  if (!product.directions.length) missing.push("directions");
  if (!product.warnings.length) missing.push("warnings");
  if (!product.sourceReferences.length) missing.push("sources");
  if (!product.flavors.length) missing.push("wholesale variants");
  if (!product.otherIngredients.length) missing.push("other ingredients / excipients");
  return {
    productId: product.id,
    product: product.shortName,
    verification: product.verificationStatus,
    exactIngredientCount: product.fullServing.length - unknownAmounts.length,
    proprietaryOrUnknownCount: unknownAmounts.length,
    unknownAmounts: unknownAmounts.map((ingredient) => ({
      ingredient: ingredient.name,
      status: ingredient.amountStatus,
      blend: ingredient.blendName,
      labelOrder: ingredient.labelOrder,
    })),
    missing,
    conflicts: product.conflicts,
    unavailableVariants: unavailable.map((variant) => `${variant.flavor}: ${variant.stockStatus}${variant.visibility === "hidden" ? " / hidden" : ""}`),
    faqCount: knowledge.faq.filter((faq) => faq.productId === product.id).length,
    comparisonCount: knowledge.comparisons.filter((comparison) => comparison.productIds.includes(product.id)).length,
  };
});

const weakIngredients = knowledge.ingredients
  .filter((ingredient) => ingredient.evidenceSupportedRanges.length === 0)
  .map((ingredient) => ({
    id: ingredient.id,
    name: ingredient.name,
    reason: "No high-confidence evidence dosage range is stored; product-label facts remain available.",
  }));

const unresolved = findings.filter((finding) => finding.missing.length || finding.conflicts.length || finding.proprietaryOrUnknownCount);
const report = {
  generatedAt: new Date().toISOString(),
  schemaVersion: knowledge.schemaVersion,
  counts: {
    products: knowledge.products.length,
    ingredients: knowledge.ingredients.length,
    comparisons: knowledge.comparisons.length,
    faqs: knowledge.faq.length,
    stacks: knowledge.stacks.length,
    retrievalChunks: knowledge.retrievalChunks.length,
    benchmarks: knowledge.benchmarks.length,
    productsWithUnresolvedFields: unresolved.length,
    ingredientsWithoutResearchRange: weakIngredients.length,
  },
  sourcePriority: [
    "Current Supplement Facts label",
    "Official 2026 catalog",
    "Portal catalog for wholesale price/status",
    "Current official product page",
    "Older owner guide only when a newer label does not supersede it",
  ],
  findings,
  ingredientsWithoutResearchRange: weakIngredients,
};

const markdown = [
  "# BLACKMARKET AI Knowledge Audit",
  "",
  `Generated: ${report.generatedAt}`,
  "",
  "## Coverage",
  "",
  `- ${report.counts.products} products`,
  `- ${report.counts.ingredients} normalized ingredients`,
  `- ${report.counts.comparisons} dedicated comparisons`,
  `- ${report.counts.faqs} product FAQs`,
  `- ${report.counts.stacks} stack records`,
  `- ${report.counts.retrievalChunks} retrieval chunks`,
  `- ${report.counts.benchmarks} benchmark questions`,
  "",
  "## Source priority",
  "",
  ...report.sourcePriority.map((item, index) => `${index + 1}. ${item}`),
  "",
  "## Product gaps and limitations",
  "",
  ...findings.flatMap((finding) => [
    `### ${finding.product}`,
    "",
    `- Verification: ${finding.verification}`,
    `- Exact ingredient amounts: ${finding.exactIngredientCount}`,
    `- Proprietary/unknown ingredient amounts: ${finding.proprietaryOrUnknownCount}`,
    `- FAQ records: ${finding.faqCount}`,
    `- Dedicated comparisons: ${finding.comparisonCount}`,
    `- Missing fields: ${finding.missing.length ? finding.missing.join(", ") : "none"}`,
    `- Conflicts/notes: ${finding.conflicts.length ? finding.conflicts.join(" | ") : "none"}`,
    `- Unavailable variants: ${finding.unavailableVariants.length ? finding.unavailableVariants.join(", ") : "none"}`,
    "",
  ]),
  "## Research-range limitation",
  "",
  `${weakIngredients.length} label ingredients intentionally have no stored evidence dosage range. The assistant can still report their verified label presence and exact/proprietary amount status, but it must not invent a research threshold.`,
  "",
].join("\n");

await Promise.all([
  writeFile(path.join(root, "knowledge/exports/audit.json"), `${JSON.stringify(report, null, 2)}\n`),
  writeFile(path.join(root, "knowledge/research/AUDIT.md"), markdown),
]);

console.log(JSON.stringify(report.counts, null, 2));
if (knowledge.products.some((product) => !product.fullServing.length || !product.sourceReferences.length)) {
  process.exitCode = 1;
}
