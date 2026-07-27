import { KNOWLEDGE } from "../../../knowledge/exports/knowledge.generated.ts";
import type {
  CanonicalComparison,
  CanonicalIngredient,
  CanonicalKnowledge,
  CanonicalProduct,
  RetrievalChunk,
  SalesRecommendation,
} from "./canonical-types.ts";
import type { AssistantContext, AssistantIntent } from "./types.ts";

export interface RetrievalResult {
  intent: AssistantIntent;
  detectedProductIds: string[];
  detectedIngredientIds: string[];
  chunks: Array<RetrievalChunk & { score: number; reasons: string[] }>;
  sourceConfidence: "high" | "medium" | "low";
}

const knowledge = KNOWLEDGE as CanonicalKnowledge;
const productsById = new Map(knowledge.products.map((product) => [product.id, product]));
const ingredientsById = new Map(knowledge.ingredients.map((ingredient) => [ingredient.id, ingredient]));
const comparisonsByKey = new Map(knowledge.comparisons.map((comparison) => [comparison.id, comparison]));

const semanticSynonyms: Record<string, string[]> = {
  "non stim": ["stimulant free", "stim free", "late night"],
  "stim free": ["stimulant free", "non stim", "late night"],
  "fat burner": ["thermogenic", "cutting", "weight loss"],
  "focus pre": ["focus", "nootropic", "concentration"],
  "test pre": ["strength", "testosterone", "bulk"],
  "high stim": ["stimulant", "energy", "caffeine", "experienced"],
  "pump": ["blood flow", "vascularity", "nitrate", "citrulline"],
  "strength": ["power", "mass", "creatine", "hmb"],
  "natural": ["stevia", "natural flavors", "natural colors"],
  "night": ["late night", "stimulant free", "non stim"],
};

export function getCanonicalKnowledge(): CanonicalKnowledge {
  return knowledge;
}

export function getCanonicalProduct(productId: string): CanonicalProduct | undefined {
  return productsById.get(productId);
}

export function getCanonicalIngredient(ingredientId: string): CanonicalIngredient | undefined {
  return ingredientsById.get(ingredientId);
}

export function getCanonicalComparison(productIds: string[]): CanonicalComparison | undefined {
  if (productIds.length < 2) return undefined;
  return comparisonsByKey.get(pairKey(productIds[0], productIds[1]));
}

export function getSalesRecommendation(query: string): SalesRecommendation | undefined {
  const normalized = normalize(query);
  return knowledge.sales
    .map((rule) => ({
      rule,
      score: rule.queryTags.reduce((score, tag) => score + phraseScore(normalized, normalize(tag)), 0),
    }))
    .sort((a, b) => b.score - a.score)[0]?.score
    ? knowledge.sales
        .map((rule) => ({ rule, score: rule.queryTags.reduce((score, tag) => score + phraseScore(normalized, normalize(tag)), 0) }))
        .sort((a, b) => b.score - a.score)[0]?.rule
    : undefined;
}

export function detectCanonicalProductIds(query: string, context?: AssistantContext): string[] {
  const normalized = normalize(query);
  const detected = knowledge.products
    .map((product) => {
      const aliases = unique([
        product.shortName,
        product.officialName,
        ...product.aliases,
        ...product.commonMisspellings,
      ]).map(normalize).sort((a, b) => b.length - a.length);
      const best = Math.max(0, ...aliases.map((alias) => aliasMatchScore(normalized, alias)));
      return { id: product.id, best };
    })
    .filter((match) => match.best > 0)
    .sort((a, b) => b.best - a.best);
  const ids = detected.filter((candidate) => !detected.some((other) => (
    other.id !== candidate.id
    && other.best > candidate.best
    && normalize(productsById.get(other.id)?.shortName ?? "").includes(normalize(productsById.get(candidate.id)?.shortName ?? ""))
  ))).map((match) => match.id);
  if (!ids.length && /\b(it|that|those|them|which one|the two|both|one)\b/.test(normalized)) {
    return context?.productIds ?? [];
  }
  return unique(ids);
}

export function detectCanonicalIngredientIds(query: string): string[] {
  const normalized = normalize(query);
  return knowledge.ingredients
    .map((ingredient) => {
      const aliases = unique([ingredient.name, ingredient.normalizedName, ...ingredient.aliases]).map(normalize);
      return { id: ingredient.id, score: Math.max(0, ...aliases.map((alias) => aliasMatchScore(normalized, alias))) };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((item) => item.id);
}

export function retrieveKnowledge(
  query: string,
  intent: AssistantIntent,
  context: AssistantContext = { productIds: [], variantIds: [] },
  explicitProductIds: string[] = [],
): RetrievalResult {
  const normalized = normalize(query);
  const expandedTokens = expandQueryTokens(normalized);
  const detectedProductIds = unique([...explicitProductIds, ...detectCanonicalProductIds(query, context)]);
  const detectedIngredientIds = detectCanonicalIngredientIds(query);
  const pair = detectedProductIds.length >= 2 ? pairKey(detectedProductIds[0], detectedProductIds[1]) : "";
  const scored = knowledge.retrievalChunks.map((chunk) => {
    let score = sparseCosine(expandedTokens, chunk.tokens) * 120 + chunk.priority / 10;
    const reasons: string[] = [];
    if (pair && chunk.kind === "comparison" && chunk.id === `comparison:${pair}`) {
      score += 500;
      reasons.push("dedicated comparison pair");
    }
    const productHits = chunk.entityIds.filter((id) => detectedProductIds.includes(id)).length;
    if (productHits) {
      score += productHits * 125;
      reasons.push(`${productHits} exact product match${productHits === 1 ? "" : "es"}`);
    }
    const ingredientHits = chunk.entityIds.filter((id) => detectedIngredientIds.includes(id)).length;
    if (ingredientHits) {
      score += ingredientHits * 110;
      reasons.push(`${ingredientHits} exact ingredient match${ingredientHits === 1 ? "" : "es"}`);
    }
    if (intent === "compare_products" && chunk.kind === "comparison") {
      score += 90;
      reasons.push("comparison intent");
    }
    if (["find_by_ingredient", "exclude_ingredient"].includes(intent) && chunk.kind === "ingredient") {
      score += 90;
      reasons.push("ingredient intent");
    }
    if (intent === "explain_product" && ["formula", "product"].includes(chunk.kind)) {
      score += 70;
      reasons.push("product explanation intent");
    }
    if (intent === "find_by_goal" && chunk.kind === "sales") {
      score += 80;
      reasons.push("recommendation intent");
    }
    if (chunk.confidence === "high") score += 25;
    if (chunk.sourceIds.some((sourceId) => sourceId.includes("current-label"))) {
      score += 35;
      reasons.push("current label source");
    }
    return { ...chunk, score: Math.round(score * 100) / 100, reasons };
  }).filter((chunk) => chunk.score >= 15).sort((a, b) => b.score - a.score).slice(0, 14);

  const sourceConfidence = scored.every((chunk) => chunk.confidence === "high")
    ? "high"
    : scored.some((chunk) => chunk.confidence === "low")
      ? "low"
      : "medium";
  const result = { intent, detectedProductIds, detectedIngredientIds, chunks: scored, sourceConfidence } satisfies RetrievalResult;
  logRetrieval(query, result);
  return result;
}

function logRetrieval(query: string, result: RetrievalResult) {
  if (process.env.NODE_ENV !== "development" && process.env.ASSISTANT_DEBUG !== "true") return;
  console.info("[BLACKMARKET AI retrieval]", JSON.stringify({
    query,
    intent: result.intent,
    detectedProducts: result.detectedProductIds,
    detectedIngredients: result.detectedIngredientIds,
    retrievedChunks: result.chunks.map((chunk) => ({
      id: chunk.id,
      kind: chunk.kind,
      score: chunk.score,
      reasons: chunk.reasons,
      confidence: chunk.confidence,
    })),
    sourceConfidence: result.sourceConfidence,
  }));
}

function expandQueryTokens(normalized: string): string[] {
  const expanded = [normalized];
  for (const [phrase, related] of Object.entries(semanticSynonyms)) {
    if (containsPhrase(normalized, phrase)) expanded.push(...related);
  }
  return unique(expanded.flatMap(tokenize));
}

function sparseCosine(queryTokens: string[], documentTokens: string[]): number {
  const queryCounts = counts(queryTokens);
  const documentCounts = counts(documentTokens);
  const vocabulary = unique([...queryCounts.keys(), ...documentCounts.keys()]);
  let dot = 0;
  let queryNorm = 0;
  let documentNorm = 0;
  for (const token of vocabulary) {
    const queryWeight = queryCounts.get(token) ?? 0;
    const documentWeight = documentCounts.get(token) ?? 0;
    dot += queryWeight * documentWeight;
    queryNorm += queryWeight ** 2;
    documentNorm += documentWeight ** 2;
  }
  if (!queryNorm || !documentNorm) return 0;
  return dot / (Math.sqrt(queryNorm) * Math.sqrt(documentNorm));
}

function counts(tokens: string[]): Map<string, number> {
  const result = new Map<string, number>();
  for (const token of tokens) result.set(token, (result.get(token) ?? 0) + 1);
  return result;
}

function aliasMatchScore(query: string, alias: string): number {
  if (!alias || alias.length < 2) return 0;
  if (query === alias) return 300 + alias.length;
  if (containsPhrase(query, alias)) return 200 + alias.length;
  const queryTokens = tokenize(query);
  const aliasTokens = tokenize(alias);
  if (aliasTokens.length > 1 && aliasTokens.every((token) => queryTokens.includes(token))) return 120 + alias.length;
  if (alias.length >= 5 && levenshteinClosest(queryTokens, alias) <= 1) return 80 + alias.length;
  return 0;
}

function levenshteinClosest(queryTokens: string[], alias: string): number {
  return Math.min(...queryTokens.map((token) => levenshtein(token, alias)), Number.POSITIVE_INFINITY);
}

function levenshtein(first: string, second: string): number {
  const row = Array.from({ length: second.length + 1 }, (_, index) => index);
  for (let i = 1; i <= first.length; i += 1) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= second.length; j += 1) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (first[i - 1] === second[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[second.length];
}

function phraseScore(query: string, phrase: string): number {
  if (query === phrase) return 100;
  if (containsPhrase(query, phrase)) return 50;
  return sparseCosine(tokenize(query), tokenize(phrase)) * 25;
}

function pairKey(first: string, second: string): string {
  return [first, second].sort().join("|");
}

function containsPhrase(haystack: string, needle: string): boolean {
  return ` ${haystack} `.includes(` ${needle} `);
}

function tokenize(value: string): string[] {
  return normalize(value).split(" ").filter((token) => token.length > 1);
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}
