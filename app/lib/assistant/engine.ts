import type {
  AssistantCartAction,
  AssistantContext,
  AssistantIntent,
  AssistantProduct,
  AssistantResponse,
  AssistantVariant,
} from "@/lib/assistant/types";

export interface AnswerOptions {
  context?: AssistantContext;
  cart?: Record<string, number>;
}

interface EntityResolution {
  products: AssistantProduct[];
  variants: Array<{ product: AssistantProduct; variant: AssistantVariant }>;
  ingredient?: string;
}

const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, dozen: 12,
};

const INGREDIENT_ALIASES: Record<string, string[]> = {
  "creatine monohydrate": ["creatine", "creatine monohydrate", "creatine mono"],
  "calcium hmb": ["hmb", "calcium hmb"],
  "l citrulline": ["citrulline", "l citrulline", "citrulline malate"],
  "beta alanine": ["beta alanine", "beta alinine"],
  "caffeine": ["caffeine", "caffeine anhydrous", "natural caffeine"],
  "alpha gpc": ["alpha gpc", "alpha-gpc"],
  "lion s mane": ["lion s mane", "lions mane", "lion's mane"],
  "l carnitine": ["carnitine", "l carnitine", "acetyl l carnitine"],
  "yohimbine": ["yohimbine", "alpha yohimbine", "rauwolscine"],
  "betaine": ["betaine", "betaine anhydrous"],
  "taurine": ["taurine"],
  "l tyrosine": ["tyrosine", "l tyrosine", "n acetyl l tyrosine"],
  "d aspartic acid": ["d aspartic acid", "daa"],
  "progbb": ["progbb", "pro gbb"],
  "glycerol": ["glycerol"],
  "uridine": ["uridine", "uridine monophosphate"],
  "theanine": ["theanine", "l theanine"],
  "bitter orange": ["bitter orange", "citrus aurantium"],
  "nootropics": ["nootropic", "nootropics"],
};

const GOAL_ALIASES: Record<string, string[]> = {
  pump: ["pump", "blood flow", "vascularity", "nitric oxide"],
  focus: ["focus", "nootropic", "concentration", "locked in", "mental", "tunnel vision"],
  cutting: ["cut", "cutting", "thermogenic", "lean out", "fat loss", "shred"],
  strength: ["strength", "muscle", "bulk", "mass", "size", "power"],
  recovery: ["recovery", "recover"],
  daily: ["daily", "everyday", "consistent"],
  "stim-free": ["stim free", "stimulant free", "no caffeine", "without caffeine", "caffeine sensitive"],
  energy: ["energy", "stim", "stimulant", "high stim", "strongest", "intense"],
};

export function normalizeAssistantText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[™®]/g, "")
    .replace(/[^a-z0-9$]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectAssistantIntent(question: string, entityCount = 0): AssistantIntent {
  const query = normalizeAssistantText(question);
  if (
    /\b(diagnose|diagnosis|treat|cure|prevent|disease|medical condition|medication|pregnant|pregnancy)\b/.test(query)
    || /\b(safe|recommend|best)\b.*\b(blood pressure|diabetes|heart|kidney|liver|anxiety|condition)\b/.test(query)
  ) return "unsupported_question";
  if (/\b(replace|swap|switch)\b/.test(query)) return "replace_cart_item";
  if (/\b(remove|delete|take out)\b/.test(query) && /\b(cart|order|from)\b/.test(query)) return "remove_from_cart";
  if (/\b(set|make|change|update)\b/.test(query) && /\b(quantity|qty|units?|cart|order|\d+)\b/.test(query)) return "update_quantity";
  if (/\b(add|put|give me)\b/.test(query) && /\b(cart|order|units?|case|each|\d+|one|two|three|four|five|six|seven|eight|nine|ten|dozen)\b/.test(query)) return "add_to_cart";
  if (/\b(summarize|summary|total|retail value|wholesale cost)\b/.test(query) && /\b(cart|order)\b/.test(query)) return "summarize_cart";
  if (/\b(missing|need from|categories am i)\b/.test(query) && /\b(cart|order)\b/.test(query)) return "identify_missing_categories";
  if (/\b(most|highest|rank|strongest|more|how much)\b/.test(query) && /\b(caffeine|stim|stimulant)\b/.test(query)) return "rank_by_caffeine";
  if (/\b(compare|comparison|difference|different|versus|vs)\b/.test(query) || entityCount >= 2) return "compare_products";
  if (/\b(margin|markup|profit)\b/.test(query)) return "calculate_margin";
  if (/\b(wholesale|map|price|pricing|cost)\b/.test(query)) return "show_pricing";
  if (/\b(flavor|flavors|taste|available in)\b/.test(query)) return "show_flavors";
  if (/\b(opening order|starter order|balanced order|build (me )?an? ?order|stock for|what should i stock)\b/.test(query)) return "suggest_opening_order";
  if (/\b(stock|available|sold out|coming soon|running low|limited|status)\b/.test(query)) return "show_stock";
  if (/\b(new|newest|coming soon|limited edition)\b/.test(query)) return "show_new_products";
  if (/\b(stim free|stimulant free|no caffeine|without caffeine|caffeine sensitive)\b/.test(query)) return "find_stimulant_free";
  if (/\b(without|exclude|doesn t contain|do not contain|no)\b/.test(query) && ingredientFromQuery(query)) return "exclude_ingredient";
  if (/\b(ingredient|ingredients|contain|contains|containing|have|has|with|dosage|dose)\b/.test(query) && (ingredientFromQuery(query) || /\bnootropic/.test(query))) return "find_by_ingredient";
  if (/\b(pair|pairs|pairing|stack|complement|cross sell|goes with)\b/.test(query)) return "suggest_product_pairing";
  if (/\b(staff|employee|explain|talking point|train)\b/.test(query)) return "staff_training";
  if (/\b(best|recommend|which product|what should|good for|goal|customer wants|experienced)\b/.test(query)) return "find_by_goal";
  if (entityCount > 0) return "explain_product";
  return "unsupported_question";
}

export function resolveAssistantEntities(
  question: string,
  products: AssistantProduct[],
  context: AssistantContext = { productIds: [], variantIds: [] },
): EntityResolution {
  const query = normalizeAssistantText(question);
  const productMatches = products.flatMap((product) => {
    const phrases = unique([
      product.shortName,
      product.name,
      ...product.aliases,
      ...product.commonMisspellings,
    ]).map(normalizeAssistantText).filter(Boolean).sort((a, b) => b.length - a.length);
    const match = phrases.find((phrase) => containsPhrase(query, phrase));
    return match ? [{ product, phrase: match }] : [];
  });
  let filteredProductMatches = productMatches.filter((candidate) => {
    const longer = productMatches.find((other) => (
      other.product.id !== candidate.product.id
      && other.phrase.length > candidate.phrase.length
      && other.phrase.includes(candidate.phrase)
    ));
    if (!longer) return true;
    const withoutLonger = query.replaceAll(longer.phrase, " ");
    return containsPhrase(withoutLonger, candidate.phrase);
  });
  const ingredientQuestion = /\b(ingredient|ingredients|contain|contains|have|has|without|exclude)\b/.test(query);
  if (ingredientQuestion) {
    const rawIngredientProducts = new Set(["creatine-monohydrate-raw", "beta-alanine-raw", "l-citrulline-raw"]);
    const hasExplicitRawName = /\b(raw|monohydrate)\b/.test(query);
    if (!hasExplicitRawName) {
      filteredProductMatches = filteredProductMatches.filter((candidate) => !rawIngredientProducts.has(candidate.product.id));
    }
  }

  const variantMatches = products.flatMap((product) => product.variants.flatMap((variant) => {
    const flavor = normalizeAssistantText(variant.flavor);
    return flavor && containsPhrase(query, flavor) ? [{ product, variant }] : [];
  }));

  let matchedProducts = uniqueBy([
    ...filteredProductMatches.map((match) => match.product),
    ...variantMatches.map((match) => match.product),
  ], (product) => product.id);
  if (!matchedProducts.length && /\b(it|that|those|them|which one|the two|both)\b/.test(query)) {
    matchedProducts = context.productIds
      .map((id) => products.find((product) => product.id === id))
      .filter((product): product is AssistantProduct => Boolean(product));
  }

  return {
    products: matchedProducts,
    variants: uniqueBy(variantMatches, (match) => match.variant.id),
    ingredient: ingredientFromQuery(query),
  };
}

export function answerAssistantQuestion(
  question: string,
  products: AssistantProduct[],
  options: AnswerOptions = {},
): AssistantResponse {
  const context = options.context ?? { productIds: [], variantIds: [] };
  const entities = resolveAssistantEntities(question, products, context);
  const intent = detectAssistantIntent(question, entities.products.length);
  const base = {
    id: responseId(question),
    intent,
    nextContext: {
      productIds: entities.products.map((product) => product.id),
      variantIds: entities.variants.map((entry) => entry.variant.id),
      lastIntent: intent,
    },
  };

  switch (intent) {
    case "compare_products":
      return comparisonResponse(base, entities.products);
    case "explain_product":
      return explanationResponse(base, entities.products[0]);
    case "find_by_ingredient":
      return ingredientResponse(base, products, broadIngredientEntities(question, entities), false);
    case "exclude_ingredient":
      return ingredientResponse(base, products, broadIngredientEntities(question, entities), true);
    case "rank_by_caffeine":
      return caffeineResponse(base, products, entities.products);
    case "find_stimulant_free":
      return stimulantFreeResponse(base, products);
    case "calculate_margin":
    case "show_pricing":
      return pricingResponse(base, products, entities.products, intent);
    case "show_flavors":
      return flavorResponse(base, entities.products);
    case "show_stock":
    case "show_new_products":
      return stockResponse(base, products, entities.products, intent);
    case "find_by_goal":
      return recommendationResponse(base, question, products);
    case "suggest_opening_order":
      return openingOrderResponse(base, question, products);
    case "suggest_product_pairing":
      return pairingResponse(base, products, entities.products);
    case "staff_training":
      return staffTrainingResponse(base, entities.products[0]);
    case "add_to_cart":
    case "remove_from_cart":
    case "replace_cart_item":
    case "update_quantity":
      return cartActionResponse(base, question, products, entities, options.cart ?? {});
    case "summarize_cart":
      return cartSummaryResponse(base, products, options.cart ?? {});
    case "identify_missing_categories":
      return missingCategoryResponse(base, products, options.cart ?? {});
    default:
      return {
        ...base,
        directAnswer: "I don’t have enough verified product information to answer that accurately.",
        details: ["Try asking about a product, formula, ingredient, price, flavor, comparison, stocking goal, or cart action."],
        productIds: [],
        responseType: "unsupported",
      };
  }
}

function comparisonResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  products: AssistantProduct[],
): AssistantResponse {
  if (products.length < 2) {
    return clarification(base, "Which products would you like to compare?", []);
  }
  const compared = products.slice(0, 3);
  const rows = [
    { label: "Primary purpose", values: compared.map((product) => product.purpose) },
    { label: "Caffeine", values: compared.map(caffeineLabel) },
    { label: "Serving", values: compared.map((product) => product.formula.servingSize ?? "Not verified") },
    { label: "Formula highlights", values: compared.map((product) => product.keyDifferentiators.slice(0, 3).join(" · ")) },
    { label: "Wholesale", values: compared.map(priceRange) },
    { label: "MAP", values: compared.map(mapRange) },
    { label: "Available flavors", values: compared.map((product) => availableVariants(product).map((variant) => variant.flavor).join(", ") || "None") },
  ];
  const caffeineKnown = compared.filter((product) => product.formula.totalCaffeineMg !== undefined);
  const highest = [...caffeineKnown].sort((a, b) => (b.formula.totalCaffeineMg ?? 0) - (a.formula.totalCaffeineMg ?? 0))[0];
  const lead = highest
    ? `${compared.map((product) => product.shortName).join(" and ")} serve different retailer needs. ${highest.shortName} has the highest verified full-serving caffeine in this comparison at ${highest.formula.totalCaffeineMg} mg.`
    : `${compared.map((product) => product.shortName).join(" and ")} serve different retailer needs; a confirmed caffeine comparison is not available for every product.`;
  return {
    ...base,
    directAnswer: lead,
    details: compared.map((product) => `${product.shortName}: ${product.retailerPitch}`),
    productIds: compared.map((product) => product.id),
    comparison: { productIds: compared.map((product) => product.id), rows },
    nextContext: { productIds: compared.map((product) => product.id), variantIds: [], lastIntent: "compare_products" },
    responseType: "comparison",
  };
}

function explanationResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  product?: AssistantProduct,
): AssistantResponse {
  if (!product) return clarification(base, "Which product would you like to know about?", []);
  return {
    ...base,
    directAnswer: product.purpose,
    details: [
      product.retailerPitch,
      ...product.keyDifferentiators,
      product.formula.verification === "needs-review"
        ? "Some formula fields are marked Needs Review, so only confirmed fields are shown."
        : "The displayed formula highlights are linked to verified product sources.",
    ],
    productIds: [product.id],
    responseType: "answer",
  };
}

function ingredientResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  allProducts: AssistantProduct[],
  entities: EntityResolution,
  exclude: boolean,
): AssistantResponse {
  const ingredient = entities.ingredient;
  if (!ingredient) return clarification(base, "Which ingredient should I search for?", []);
  if (entities.products.length) {
    const matching = entities.products.filter((product) => productHasIngredient(product, ingredient));
    const unknown = entities.products.filter((product) => !productHasIngredient(product, ingredient) && product.formula.verification !== "verified");
    if (exclude) {
      const clear = entities.products.filter((product) => !productHasIngredient(product, ingredient) && product.formula.verification === "verified");
      return {
        ...base,
        directAnswer: clear.length
          ? `${clear.map((product) => product.shortName).join(", ")} does not list ${displayIngredient(ingredient)} in its verified formula.`
          : "I don’t have enough verified product information to confirm that exclusion accurately.",
        details: unknown.length ? [`Needs review before exclusion can be confirmed: ${unknown.map((product) => product.shortName).join(", ")}.`] : [],
        productIds: clear.map((product) => product.id),
        responseType: "answer",
      };
    }
    return {
      ...base,
      directAnswer: matching.length
        ? `${matching.map((product) => product.shortName).join(", ")} contains ${displayIngredient(ingredient)}.`
        : unknown.length
          ? "I don’t have enough verified product information to answer that accurately."
          : `${entities.products.map((product) => product.shortName).join(", ")} does not list ${displayIngredient(ingredient)} in its verified formula.`,
      details: matching.flatMap((product) => ingredientDetails(product, ingredient)),
      productIds: matching.map((product) => product.id),
      responseType: "answer",
    };
  }

  const candidates = availableProducts(allProducts);
  const matched = candidates.filter((product) => productHasIngredient(product, ingredient));
  const result = exclude
    ? candidates.filter((product) => !productHasIngredient(product, ingredient) && product.formula.verification === "verified")
    : matched;
  return {
    ...base,
    directAnswer: result.length
      ? `${result.length} currently available product${result.length === 1 ? "" : "s"} ${exclude ? "do not list" : "contain"} ${displayIngredient(ingredient)}.`
      : "I don’t have enough verified product information to answer that accurately.",
    details: exclude
      ? ["Products with incomplete formulas are omitted from exclusion results."]
      : result.flatMap((product) => ingredientDetails(product, ingredient)),
    productIds: result.map((product) => product.id),
    nextContext: { productIds: result.map((product) => product.id), variantIds: [], lastIntent: base.intent },
    responseType: "answer",
  };
}

function caffeineResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  allProducts: AssistantProduct[],
  selected: AssistantProduct[],
): AssistantResponse {
  const pool = (selected.length ? selected : availableProducts(allProducts))
    .filter((product) => product.formula.totalCaffeineMg !== undefined)
    .sort((a, b) => (b.formula.totalCaffeineMg ?? 0) - (a.formula.totalCaffeineMg ?? 0));
  if (!pool.length) {
    return {
      ...base,
      directAnswer: "I don’t have enough verified product information to rank those products accurately.",
      details: [],
      productIds: [],
      responseType: "answer",
    };
  }
  const leaders = pool.slice(0, selected.length ? 3 : 5);
  return {
    ...base,
    directAnswer: `${leaders[0].shortName} has the highest verified full-serving caffeine in this set at ${leaders[0].formula.totalCaffeineMg} mg (${leaders[0].formula.caffeineServingBasis}).`,
    details: leaders.map((product, index) => `${index + 1}. ${product.shortName}: ${caffeineLabel(product)}`),
    productIds: leaders.map((product) => product.id),
    nextContext: { productIds: leaders.map((product) => product.id), variantIds: [], lastIntent: "rank_by_caffeine" },
    responseType: "answer",
  };
}

function stimulantFreeResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  products: AssistantProduct[],
): AssistantResponse {
  const matches = availableProducts(products).filter((product) => product.formula.stimulantFree);
  return {
    ...base,
    directAnswer: `${matches.length} currently available products are verified stimulant-free.`,
    details: matches.map((product) => `${product.shortName}: ${product.purpose}`),
    productIds: matches.map((product) => product.id),
    nextContext: { productIds: matches.map((product) => product.id), variantIds: [], lastIntent: "find_stimulant_free" },
    responseType: "recommendation",
  };
}

function pricingResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  allProducts: AssistantProduct[],
  selected: AssistantProduct[],
  intent: "calculate_margin" | "show_pricing",
): AssistantResponse {
  const pool = selected.length ? selected : availableProducts(allProducts);
  const ranked = intent === "calculate_margin"
    ? [...pool].sort((a, b) => bestMargin(b) - bestMargin(a)).slice(0, selected.length ? 3 : 6)
    : pool.slice(0, selected.length ? 3 : 6);
  return {
    ...base,
    directAnswer: intent === "calculate_margin"
      ? "Margin is calculated as (MAP − current wholesale price) ÷ MAP. Account-specific wholesale prices are applied when signed in."
      : "These are the current server-resolved wholesale and MAP prices.",
    details: ranked.map((product) => {
      const variant = availableVariants(product)[0] ?? product.variants[0];
      return variant
        ? `${product.shortName}: ${money(variant.wholesalePrice)} wholesale · ${money(variant.mapPrice)} MAP · ${variant.marginPercent.toFixed(2)}% MAP margin`
        : `${product.shortName}: no available variant`;
    }),
    productIds: ranked.map((product) => product.id),
    nextContext: { productIds: ranked.map((product) => product.id), variantIds: [], lastIntent: intent },
    responseType: "answer",
  };
}

function flavorResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  products: AssistantProduct[],
): AssistantResponse {
  if (!products.length) return clarification(base, "Which product’s flavors would you like to see?", []);
  return {
    ...base,
    directAnswer: products.map((product) => {
      const count = availableVariants(product).length;
      return `${product.shortName} has ${count} currently available flavor${count === 1 ? "" : "s"}.`;
    }).join(" "),
    details: products.flatMap((product) => product.variants.map((variant) => (
      `${product.shortName} ${variant.flavor}: ${statusLabel(variant)}`
    ))),
    productIds: products.map((product) => product.id),
    responseType: "answer",
  };
}

function stockResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  allProducts: AssistantProduct[],
  selected: AssistantProduct[],
  intent: "show_stock" | "show_new_products",
): AssistantResponse {
  const pool = selected.length
    ? selected
    : intent === "show_new_products"
      ? allProducts.filter((product) => product.variants.some((variant) => variant.limited || variant.status === "coming-soon"))
      : allProducts;
  const details = pool.flatMap((product) => product.variants
    .filter((variant) => selected.length || variant.limited || variant.status !== "available" || variant.runningLow)
    .map((variant) => `${product.shortName} ${variant.flavor}: ${statusLabel(variant)}${variant.limited ? " · Limited edition" : ""}`));
  return {
    ...base,
    directAnswer: details.length
      ? "Here is the current portal-managed availability."
      : "No matching limited, coming-soon, running-low, or sold-out variants were found.",
    details,
    productIds: pool.map((product) => product.id),
    responseType: "answer",
  };
}

function recommendationResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  question: string,
  products: AssistantProduct[],
): AssistantResponse {
  const query = normalizeAssistantText(question);
  const goals = Object.entries(GOAL_ALIASES)
    .filter(([, aliases]) => aliases.some((alias) => containsPhrase(query, normalizeAssistantText(alias))))
    .map(([goal]) => goal);
  if (!goals.length && /\bexperienced/.test(query)) goals.push("energy");
  const available = availableProducts(products);
  const scored = available.map((product) => {
    let score = 0;
    const reasons: string[] = [];
    for (const goal of goals) {
      if (product.goals.includes(goal as AssistantProduct["goals"][number])) {
        score += 5;
        reasons.push(goalLabel(goal));
      }
    }
    if (/\bexperienced|strongest|high stim|intense\b/.test(query) && (product.formula.totalCaffeineMg ?? 0) >= 350) {
      score += 4;
      reasons.push(`${product.formula.totalCaffeineMg} mg verified full-serving caffeine`);
    }
    if (/\b(caffeine sensitive|low stim|lower stim)\b/.test(query) && product.formula.stimulantFree) {
      score += 8;
      reasons.push("verified stimulant-free formula");
    }
    if (/\bdaily|everyday\b/.test(query) && product.goals.includes("daily")) score += 3;
    return { product, score, reasons: unique(reasons) };
  }).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score || bestMargin(b.product) - bestMargin(a.product));
  const result = (scored.length ? scored : available.map((product) => ({ product, score: 0, reasons: [product.purpose] }))).slice(0, 4);
  return {
    ...base,
    directAnswer: goals.length
      ? `These are the strongest verified matches for ${goals.map(goalLabel).join(" and ")}.`
      : "These are broad starting points. Add a goal, stimulant preference, ingredient, budget, or desired MAP for a tighter recommendation.",
    details: result.map((entry) => `${entry.product.shortName}: ${entry.reasons.join(" · ")}`),
    productIds: result.map((entry) => entry.product.id),
    nextContext: { productIds: result.map((entry) => entry.product.id), variantIds: [], lastIntent: "find_by_goal" },
    responseType: "recommendation",
  };
}

function openingOrderResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  question: string,
  products: AssistantProduct[],
): AssistantResponse {
  const available = availableProducts(products);
  const preferred = [
    "cuts-thermogenic-pre-workout",
    "bulk-testosterone-pre-workout",
    "nootropic-high-focus-pre-workout",
    "pump-hyper-pump-pre-workout",
    "creatine-monohydrate-raw",
    "cuts-heat-stim-free-thermogenic",
  ].map((id) => available.find((product) => product.id === id)).filter((product): product is AssistantProduct => Boolean(product));
  const budget = parseBudget(question);
  const estimated = preferred.reduce((total, product) => total + (availableVariants(product)[0]?.wholesalePrice ?? 0), 0);
  return {
    ...base,
    directAnswer: "This starter mix covers thermogenic, strength, focus, dedicated pump, stimulant-free, and RAW creatine positions without automatically changing the cart.",
    details: [
      ...preferred.map((product) => `${product.shortName}: ${product.retailerPitch}`),
      `One unit of one available flavor from each is approximately ${money(estimated)} wholesale.`,
      ...(budget ? [`Your ${money(budget)} budget allows room to increase quantities after choosing the best flavors for your store.`] : []),
      "Case quantities are not yet verified, so the assistant will not guess case-based quantities.",
    ],
    productIds: preferred.map((product) => product.id),
    nextContext: { productIds: preferred.map((product) => product.id), variantIds: [], lastIntent: "suggest_opening_order" },
    responseType: "recommendation",
  };
}

function pairingResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  allProducts: AssistantProduct[],
  selected: AssistantProduct[],
): AssistantResponse {
  if (!selected.length) return clarification(base, "Which product should I build pairings around?", []);
  const ids = unique(selected.flatMap((product) => product.relationships.complements));
  const matches = ids.map((id) => allProducts.find((product) => product.id === id))
    .filter((product): product is AssistantProduct => product !== undefined)
    .filter(isAvailable);
  return {
    ...base,
    directAnswer: matches.length
      ? `${selected.map((product) => product.shortName).join(", ")} pairs cleanly with ${matches.map((product) => product.shortName).join(", ")} in the current approved product relationships.`
      : "No verified pairing has been approved for that product yet.",
    details: matches.map((product) => product.retailerPitch),
    productIds: matches.map((product) => product.id),
    nextContext: { productIds: [selected[0].id, ...matches.map((product) => product.id)], variantIds: [], lastIntent: "suggest_product_pairing" },
    responseType: "recommendation",
  };
}

function staffTrainingResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  product?: AssistantProduct,
): AssistantResponse {
  if (!product) return clarification(base, "Which product should the staff explanation cover?", []);
  return {
    ...base,
    directAnswer: `${product.shortName}: ${product.retailerPitch}`,
    details: [
      `Best for: ${product.bestFor.join("; ")}.`,
      `Main differences: ${product.keyDifferentiators.join("; ")}.`,
      `Avoid positioning it for: ${product.notIdealFor.join("; ")}.`,
      "Keep the explanation to product positioning and verified label facts; do not make medical claims.",
    ],
    productIds: [product.id],
    responseType: "answer",
  };
}

function cartActionResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  question: string,
  allProducts: AssistantProduct[],
  entities: EntityResolution,
  cart: Record<string, number>,
): AssistantResponse {
  if (/\bcase|cases\b/.test(normalizeAssistantText(question))) {
    return {
      ...base,
      directAnswer: "I don’t have verified case quantities for every product yet, so I won’t guess a case size.",
      details: ["Ask for a specific unit quantity instead, or add case quantities in Assistant Knowledge once they are confirmed."],
      productIds: entities.products.map((product) => product.id),
      responseType: "unsupported",
    };
  }
  if (base.intent === "replace_cart_item") {
    if (entities.products.length < 2) return clarification(base, "Which product should be replaced, and what should replace it?", []);
    const [from, to] = entities.products;
    const fromLines = from.variants.filter((variant) => (cart[variant.id] ?? 0) > 0);
    const target = resolveActionVariant(to, entities.variants);
    if (!fromLines.length) {
      return {
        ...base,
        directAnswer: `${from.shortName} is not currently in the cart.`,
        details: [],
        productIds: [from.id, to.id],
        responseType: "answer",
      };
    }
    if (!target) return flavorClarification(base, to);
    const quantity = fromLines.reduce((total, variant) => total + (cart[variant.id] ?? 0), 0);
    const action: AssistantCartAction = {
      type: "replace",
      label: `Replace ${quantity} ${from.shortName} unit${quantity === 1 ? "" : "s"} with ${to.shortName} ${target.flavor}`,
      updates: [
        ...fromLines.map((variant) => ({ variantId: variant.id, quantity: 0, mode: "remove" as const })),
        { variantId: target.id, quantity, mode: "add" },
      ],
    };
    return pendingCartResponse(base, action, [from.id, to.id]);
  }

  const product = entities.products[0];
  if (!product) return clarification(base, "Which product should I change in the cart?", []);
  const quantity = quantityFromQuestion(question) ?? 1;
  if (quantity > 999) {
    return {
      ...base,
      directAnswer: "That quantity is above the supported maximum of 999 units per variant.",
      details: [],
      productIds: [product.id],
      responseType: "unsupported",
    };
  }

  if (base.intent === "remove_from_cart" && !entities.variants.length) {
    const lines = product.variants.filter((variant) => (cart[variant.id] ?? 0) > 0);
    if (!lines.length) {
      return { ...base, directAnswer: `${product.shortName} is not currently in the cart.`, details: [], productIds: [product.id], responseType: "answer" };
    }
    const action: AssistantCartAction = {
      type: "remove",
      label: `Remove all ${product.shortName} variants from the cart`,
      updates: lines.map((variant) => ({ variantId: variant.id, quantity: 0, mode: "remove" })),
    };
    return pendingCartResponse(base, action, [product.id]);
  }

  const variant = resolveActionVariant(product, entities.variants);
  if (!variant) return flavorClarification(base, product);
  if (variant.status !== "available") {
    return {
      ...base,
      directAnswer: `${product.shortName} ${variant.flavor} is ${statusLabel(variant).toLowerCase()} and cannot be added.`,
      details: [],
      productIds: [product.id],
      responseType: "answer",
    };
  }
  const mode = base.intent === "add_to_cart" ? "add" : base.intent === "remove_from_cart" ? "remove" : "set";
  const action: AssistantCartAction = {
    type: mode === "add" ? "add" : mode === "remove" ? "remove" : "set",
    label: mode === "add"
      ? `Add ${quantity} × ${product.shortName} ${variant.flavor}`
      : mode === "remove"
        ? `Remove ${product.shortName} ${variant.flavor}`
        : `Set ${product.shortName} ${variant.flavor} to ${quantity}`,
    updates: [{ variantId: variant.id, quantity, mode }],
  };
  return pendingCartResponse(base, action, [product.id]);
}

function cartSummaryResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  products: AssistantProduct[],
  cart: Record<string, number>,
): AssistantResponse {
  const lines = cartLines(products, cart);
  if (!lines.length) {
    return { ...base, directAnswer: "The wholesale cart is empty.", details: [], productIds: [], responseType: "answer" };
  }
  const wholesale = lines.reduce((total, line) => total + line.quantity * line.variant.wholesalePrice, 0);
  const map = lines.reduce((total, line) => total + line.quantity * line.variant.mapPrice, 0);
  const units = lines.reduce((total, line) => total + line.quantity, 0);
  const margin = map > 0 ? ((map - wholesale) / map) * 100 : 0;
  return {
    ...base,
    directAnswer: `${units} units · ${money(wholesale)} wholesale · ${money(map)} MAP value · ${margin.toFixed(2)}% estimated MAP margin.`,
    details: lines.map((line) => `${line.quantity} × ${line.product.shortName} ${line.variant.flavor}: ${money(line.quantity * line.variant.wholesalePrice)}`),
    productIds: unique(lines.map((line) => line.product.id)),
    responseType: "answer",
  };
}

function missingCategoryResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  products: AssistantProduct[],
  cart: Record<string, number>,
): AssistantResponse {
  const lines = cartLines(products, cart);
  const covered = new Set(lines.map((line) => line.product.categorySlug));
  const desired = ["thermogenic", "strength", "focus", "pump"];
  const missing = desired.filter((category) => !covered.has(category));
  const suggestions = missing.flatMap((category) => {
    const product = availableProducts(products).find((candidate) => candidate.categorySlug === category);
    return product ? [product] : [];
  });
  return {
    ...base,
    directAnswer: missing.length
      ? `The cart is missing ${missing.map(goalLabel).join(", ")} coverage.`
      : "The cart currently covers the main thermogenic, strength, focus, and pump categories.",
    details: suggestions.map((product) => `${goalLabel(product.categorySlug)}: consider ${product.shortName}.`),
    productIds: suggestions.map((product) => product.id),
    responseType: "recommendation",
  };
}

function clarification(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  prompt: string,
  options: string[],
): AssistantResponse {
  return {
    ...base,
    directAnswer: prompt,
    details: [],
    productIds: [],
    clarification: { prompt, options },
    responseType: "clarification",
  };
}

function flavorClarification(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  product: AssistantProduct,
): AssistantResponse {
  const flavors = availableVariants(product).map((variant) => variant.flavor);
  return {
    ...base,
    directAnswer: `Which ${product.shortName} flavor should I use?`,
    details: [],
    productIds: [product.id],
    clarification: { prompt: `Choose a ${product.shortName} flavor.`, options: flavors },
    responseType: "clarification",
  };
}

function pendingCartResponse(
  base: Pick<AssistantResponse, "id" | "intent" | "nextContext">,
  action: AssistantCartAction,
  productIds: string[],
): AssistantResponse {
  return {
    ...base,
    directAnswer: `${action.label}. Confirm to update the wholesale cart.`,
    details: ["Prices and availability will still be revalidated by the server when the order is submitted."],
    productIds,
    pendingAction: action,
    responseType: "cart-action",
  };
}

function resolveActionVariant(
  product: AssistantProduct,
  matches: Array<{ product: AssistantProduct; variant: AssistantVariant }>,
): AssistantVariant | undefined {
  const matched = matches.find((entry) => entry.product.id === product.id)?.variant;
  if (matched) return matched;
  const available = availableVariants(product);
  return available.length === 1 ? available[0] : undefined;
}

function ingredientFromQuery(query: string): string | undefined {
  const normalized = normalizeAssistantText(query);
  return Object.entries(INGREDIENT_ALIASES)
    .sort((a, b) => Math.max(...b[1].map((item) => item.length)) - Math.max(...a[1].map((item) => item.length)))
    .find(([, aliases]) => aliases.some((alias) => containsPhrase(normalized, normalizeAssistantText(alias))))?.[0];
}

function productHasIngredient(product: AssistantProduct, requested: string): boolean {
  return product.formula.ingredients.some((ingredient) => ingredientMatches(ingredient.normalizedName, ingredient.roles, requested));
}

function ingredientDetails(product: AssistantProduct, requested: string): string[] {
  return product.formula.ingredients
    .filter((ingredient) => ingredientMatches(ingredient.normalizedName, ingredient.roles, requested))
    .map((ingredient) => {
      const amount = ingredient.amount === undefined ? "amount not individually disclosed" : `${formatAmount(ingredient.amount)} ${ingredient.unit}`;
      return `${product.shortName}: ${ingredient.name} — ${amount}${ingredient.servingBasis ? ` per ${ingredient.servingBasis}` : ""}.`;
    });
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(amount).replace(/0+$/, "").replace(/\.$/, "");
}

function caffeineLabel(product: AssistantProduct): string {
  return product.formula.totalCaffeineMg === undefined
    ? "Total needs review"
    : `${product.formula.totalCaffeineMg} mg per ${product.formula.caffeineServingBasis ?? "full serving"}`;
}

function priceRange(product: AssistantProduct): string {
  const prices = availableVariants(product).map((variant) => variant.wholesalePrice);
  if (!prices.length) return "Not available";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? money(min) : `${money(min)}–${money(max)}`;
}

function mapRange(product: AssistantProduct): string {
  const prices = availableVariants(product).map((variant) => variant.mapPrice);
  if (!prices.length) return "Not available";
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return min === max ? money(min) : `${money(min)}–${money(max)}`;
}

function bestMargin(product: AssistantProduct): number {
  return Math.max(0, ...availableVariants(product).map((variant) => variant.marginPercent));
}

function availableProducts(products: AssistantProduct[]): AssistantProduct[] {
  return products.filter(isAvailable);
}

function isAvailable(product: AssistantProduct): boolean {
  return availableVariants(product).length > 0;
}

function availableVariants(product: AssistantProduct): AssistantVariant[] {
  return product.variants.filter((variant) => variant.status === "available" && !variant.hidden);
}

function statusLabel(variant: AssistantVariant): string {
  if (variant.status === "sold-out") return "Sold out";
  if (variant.status === "coming-soon") return "Coming soon";
  if (variant.runningLow) return "Available · Running low";
  return "Available";
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
}

function quantityFromQuestion(question: string): number | undefined {
  const normalized = normalizeAssistantText(question);
  const digit = normalized.match(/\b(\d{1,4})\b/);
  if (digit) return Math.max(0, Math.floor(Number(digit[1])));
  const word = Object.entries(NUMBER_WORDS).find(([key]) => containsPhrase(normalized, key));
  return word?.[1];
}

function parseBudget(question: string): number | undefined {
  const match = question.replace(/,/g, "").match(/\$\s*(\d+(?:\.\d{1,2})?)/);
  return match ? Number(match[1]) : undefined;
}

function cartLines(products: AssistantProduct[], cart: Record<string, number>) {
  return products.flatMap((product) => product.variants.flatMap((variant) => {
    const quantity = Math.max(0, Math.floor(Number(cart[variant.id]) || 0));
    return quantity ? [{ product, variant, quantity }] : [];
  }));
}

function containsPhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return ` ${haystack} `.includes(` ${needle} `);
}

function displayIngredient(value: string): string {
  return value.split(" ").map((word) => word === "hmb" ? "HMB" : word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

function goalLabel(value: string): string {
  const labels: Record<string, string> = {
    "stim-free": "stimulant-free",
    thermogenic: "thermogenic",
    focus: "focus",
    pump: "pump",
    strength: "strength",
    cutting: "cutting",
    energy: "energy",
    recovery: "recovery",
    daily: "daily-use positioning",
    performance: "performance",
    hydration: "hydration",
  };
  return labels[value] ?? value.replace(/-/g, " ");
}

function responseId(question: string): string {
  let hash = 2166136261;
  for (const character of question) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return `answer-${(hash >>> 0).toString(36)}`;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function uniqueBy<T>(values: T[], key: (value: T) => string): T[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = key(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function broadIngredientEntities(question: string, entities: EntityResolution): EntityResolution {
  const query = normalizeAssistantText(question);
  if (/\b(which|what|all|every)\b.*\bproducts?\b/.test(query)) {
    return { ...entities, products: [] };
  }
  return entities;
}

function ingredientMatches(normalizedName: string, roles: string[], requested: string): boolean {
  const normalized = normalizeAssistantText(normalizedName);
  if (requested === "nootropics") return roles.includes("focus");
  if (requested === "caffeine") return roles.includes("stimulant") && normalized.includes("caffeine");
  if (requested === "l citrulline") return normalized.includes("citrulline");
  if (requested === "l carnitine") return normalized.includes("carnitine");
  if (requested === "yohimbine") return normalized.includes("yohimbine");
  if (requested === "betaine") return normalized.includes("betaine");
  if (requested === "l tyrosine") return normalized.includes("tyrosine");
  if (requested === "theanine") return normalized.includes("theanine");
  return normalized.includes(normalizeAssistantText(requested));
}
