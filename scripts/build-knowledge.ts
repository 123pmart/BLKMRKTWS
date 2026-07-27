import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { PRODUCT_KNOWLEDGE } from "../app/lib/assistant/knowledge-data.ts";
import type {
  AssistantBenchmark,
  CanonicalComparison,
  CanonicalFaq,
  CanonicalIngredient,
  CanonicalIngredientAmount,
  CanonicalKnowledge,
  CanonicalProduct,
  CanonicalSource,
  RetrievalChunk,
  SalesRecommendation,
} from "../app/lib/assistant/canonical-types.ts";

const ROOT = process.cwd();
const GENERATED_AT = new Date().toISOString();
const VERIFIED_AT = "2026-07-27";

interface RawVariant {
  id: string;
  item?: string;
  flavor?: string;
  wholesaleValue?: number;
  mapValue?: number;
  available?: boolean;
  hidden?: boolean;
  status?: string;
  limited?: boolean;
  runningLow?: boolean;
}

interface RawProduct {
  id: string;
  title?: string;
  handle?: string;
  category?: string;
  categorySlug?: string;
  description?: string;
  featured?: boolean;
  hidden?: boolean;
  status?: string;
  variants?: RawVariant[];
}

interface RawCatalog {
  products: RawProduct[];
}

const catalog = JSON.parse(await readFile(path.join(ROOT, "public/catalog-data.json"), "utf8")) as RawCatalog;
const rawById = new Map(catalog.products.map((product) => [product.id, product]));

const soldOutVariantIds = new Set([
  "defy-hyper-stimulant-white-gummy-bear-56298",
  "rule-hyper-focus-purge-pop-56299",
]);

const proprietaryBlends: Record<string, Array<{ name: string; totalAmount: number; unit: "mg" | "g" }>> = {
  "cuts-thermogenic-pre-workout": [{ name: "Fat Burning Matrix", totalAmount: 5676, unit: "mg" }],
  "cuts-natural-thermogenic-pre-workout": [{ name: "Fat Burning Matrix", totalAmount: 5626, unit: "mg" }],
  "bulk-testosterone-pre-workout": [{ name: "Testosterone/Strength Matrix", totalAmount: 9240, unit: "mg" }],
  "tone-weight-loss-pre-workout": [
    { name: "Energy Focus Blend", totalAmount: 2803, unit: "mg" },
    { name: "Weight Loss/Antioxidant Blend", totalAmount: 3799, unit: "mg" },
  ],
};

const proprietaryBlendMembers: Record<string, Record<string, string[]>> = {
  "cuts-thermogenic-pre-workout": {
    "Fat Burning Matrix": [
      "Beta-Alanine", "L-Carnitine Tartrate", "Agmatine Sulfate", "Acetyl L-Carnitine HCl",
      "Caffeine Anhydrous", "Choline Bitartrate", "Raspberry Ketone", "Bitter Orange Extract",
      "Mucuna Pruriens", "Evodiamine", "Chromium Picolinate",
    ],
  },
  "cuts-natural-thermogenic-pre-workout": {
    "Fat Burning Matrix": [
      "Beta-Alanine", "L-Carnitine Tartrate", "Agmatine Sulfate", "Acetyl L-Carnitine HCl",
      "Caffeine Anhydrous", "Choline Bitartrate", "Raspberry Ketone", "Bitter Orange Extract",
      "Mucuna Pruriens", "Evodiamine", "Chromium Picolinate",
    ],
  },
  "bulk-testosterone-pre-workout": {
    "Testosterone/Strength Matrix": [
      "Beta-Alanine", "Creatine Monohydrate", "D-Aspartic Acid", "Betaine Anhydrous",
      "Agmatine Sulfate", "Caffeine Anhydrous", "Bitter Orange Extract", "Mucuna Pruriens",
    ],
  },
  "tone-weight-loss-pre-workout": {
    "Energy Focus Blend": [
      "Beta-Alanine", "Theobromine", "Caffeine Anhydrous", "L-Theanine",
      "Bitter Orange Extract", "Vitamin B12",
    ],
    "Weight Loss/Antioxidant Blend": [
      "CLA", "L-Carnitine Tartrate", "L-Citrulline Malate", "Choline Bitartrate",
      "Eleutherococcus Senticosus", "Raspberry Ketone", "Green Coffee Bean Extract",
      "Green Tea Extract", "Pomegranate Extract", "Acai Berry Extract", "Blueberry Extract",
      "Chromium Picolinate",
    ],
  },
};

const productExtras: Record<string, Partial<CanonicalProduct>> = {
  "cuts-natural-thermogenic-pre-workout": {
    calories: 0,
    naturalOrArtificialFlavors: "Natural flavors",
    colorsAndSweeteners: "Natural colors and stevia; the current label does not list artificial sweeteners.",
  },
  "cuts-thermogenic-pre-workout": {
    calories: 5,
    naturalOrArtificialFlavors: "Natural and artificial flavors",
    colorsAndSweeteners: "See the current variant label; formula uses a proprietary matrix.",
  },
  "defy-hyper-stimulant": {
    calories: 0,
    naturalOrArtificialFlavors: "Natural and artificial flavors",
    colorsAndSweeteners: "Sucralose and acesulfame potassium are listed on the current Street Tarts label.",
  },
  "rule-hyper-focus": {
    calories: 40,
    naturalOrArtificialFlavors: "Natural flavors",
    colorsAndSweeteners: "Sucralose, acesulfame potassium, and vegetable juice color are listed on the current label.",
  },
  "underground-high-stimulant": {
    calories: 30,
    naturalOrArtificialFlavors: "Natural and artificial flavors",
    colorsAndSweeteners: "Sucralose, acesulfame potassium, turmeric color, and vegetable juice color are listed.",
  },
  "cuts-pump-thermogenic-liquid-glycerol": {
    calories: 80,
    naturalOrArtificialFlavors: "Flavor system varies by liquid variant",
    colorsAndSweeteners: "20 g carbohydrate is declared per full cap.",
  },
};

const explicitOtherIngredients: Record<string, string[]> = {
  "cuts-natural-thermogenic-pre-workout": ["Natural flavors", "Natural colors", "Stevia"],
  "defy-hyper-stimulant": ["Malic acid", "Citric acid", "Natural and artificial flavors", "Calcium silicate", "Silicon dioxide", "Sucralose", "Acesulfame potassium"],
  "rule-hyper-focus": ["Malic acid", "Citric acid", "Natural flavors", "Sucralose", "Calcium silicate", "Silicon dioxide", "Acesulfame potassium", "Vegetable juice (color)"],
  "underground-high-stimulant": ["Natural and artificial flavors", "Silicon dioxide", "Calcium silicate", "Sucralose", "Citric acid", "Trisodium citrate", "Acesulfame potassium", "Turmeric (color)", "Vegetable juice (color)"],
};

const officialPageById: Record<string, string> = {
  "cuts-thermogenic-pre-workout": "https://blackmarketlabs.com/products/cuts-thermogenic-pre-workout",
  "cuts-natural-thermogenic-pre-workout": "https://blackmarketlabs.com/products/cuts-natural-thermogenic-pre-workout",
  "cuts-diamond-ultra-thermogenic": "https://blackmarketlabs.com/products/cuts-diamond-thermogenic-pre-workout",
  "cuts-heat-stim-free-thermogenic": "https://blackmarketlabs.com/products/cuts-heat-stim-free-thermogenic",
  "cuts-pills-thermogenic-capsules": "https://blackmarketlabs.com/products/cuts-thermogenic-pills",
  "cuts-pump-thermogenic-liquid-glycerol": "https://blackmarketlabs.com/products/cuts-pump-thermogenic-glycerol",
  "scorch-ultra-thermogenic": "https://blackmarketlabs.com/products/scorch-ultra-thermogenic-pre-workout",
  "bulk-testosterone-pre-workout": "https://blackmarketlabs.com/products/bulk-strength-pre-workout",
  "bulk-apex-strength-pre-workout": "https://blackmarketlabs.com/products/bulk-apex-strength-pre-workout",
  "bulk-pills-testosterone-capsules": "https://blackmarketlabs.com/products/bulk-pills",
  "tone-weight-loss-pre-workout": "https://blackmarketlabs.com/products/tone-weight-loss-pre-workout",
  "defy-hyper-stimulant": "https://blackmarketlabs.com/products/defy-hyper-stimulant-pre-workout",
  "rule-hyper-focus": "https://blackmarketlabs.com/products/rule-hyper-focus-pre-workout",
  "underground-high-stimulant": "https://blackmarketlabs.com/products/underground-high-stimulant-pre-workout",
  "nootropic-high-focus-pre-workout": "https://blackmarketlabs.com/products/nootropic",
  "bump-laser-focus-nootropic": "https://blackmarketlabs.com/products/bump-laser-focus-nootropic",
  "nitricoxide-stim-free-pre-workout": "https://blackmarketlabs.com/products/nitricoxide-stim-free-pre-workout",
  "pump-hyper-pump-pre-workout": "https://blackmarketlabs.com/products/pump-hyper-pump-pre-workout",
};

const currentLabelById: Record<string, string> = {
  "cuts-thermogenic-pre-workout": "public/assets/site-images/cuts-thermogenic-pre-workout-panel-cuts-fruitpunch-supfact.jpg",
  "cuts-natural-thermogenic-pre-workout": "public/assets/site-images/cuts-natural-thermogenic-pre-workout-panel-cutsnat-supfacts.jpg",
  "cuts-diamond-ultra-thermogenic": "public/assets/site-images/cuts-diamond-ultra-thermogenic-11-suppfacts.jpg",
  "bulk-apex-strength-pre-workout": "public/assets/site-images/bulk-apex-strength-pre-workout-panel-bulkapex-sup-facts.png",
  "defy-hyper-stimulant": "public/assets/site-images/defy-hyper-stimulant-streettarts-supplement-facts.jpg",
  "rule-hyper-focus": "public/assets/site-images/rule-hyper-focus-6-rule-watlem-supfact.png",
  "underground-high-stimulant": "public/assets/site-images/underground-high-stimulant-6-under-peach-sup-fact.png",
  "nootropic-high-focus-pre-workout": "public/assets/site-images/nootropic-high-focus-pre-workout-4-nootr-final-side1.png",
};

let productById = new Map<string, CanonicalProduct>();

function blendForIngredient(
  productId: string,
  ingredientName: string,
  definitions: Array<{ name: string; totalAmount: number; unit: "mg" | "g" }>,
) {
  const memberMap = proprietaryBlendMembers[productId];
  if (!memberMap) return null;
  const normalizedIngredient = normalize(ingredientName);
  const definition = definitions.find((candidate) => (
    memberMap[candidate.name]?.some((member) => normalize(member) === normalizedIngredient)
  ));
  return definition ?? null;
}

function buildProduct(base: (typeof PRODUCT_KNOWLEDGE)[number]): CanonicalProduct {
  const raw = rawById.get(base.productId);
  const blendDefinitions = proprietaryBlends[base.productId] ?? [];
  const sourceReferences = unique([
    ...base.sources.map((source) => source.id),
    `${base.productId}:portal-catalog`,
    ...(officialPageById[base.productId] ? [`${base.productId}:official-page`] : []),
    ...(currentLabelById[base.productId] ? [`${base.productId}:current-label`] : []),
  ]);
  const fullServing = base.formula.ingredients.map((item): CanonicalIngredientAmount => {
    const blend = blendForIngredient(base.productId, item.name, blendDefinitions);
    const blendMembers = blend
      ? base.formula.ingredients.filter((candidate) => blendForIngredient(base.productId, candidate.name, blendDefinitions)?.name === blend.name)
      : [];
    const labelOrder = blend ? blendMembers.findIndex((candidate) => candidate.name === item.name) + 1 : null;
    return {
      ingredientId: slug(item.normalizedName || item.name),
      name: item.name,
      normalizedName: normalize(item.normalizedName || item.name),
      amount: item.amount ?? null,
      unit: item.unit ?? null,
      amountStatus: item.amount === undefined ? (blend ? "proprietary_unknown" : "not_disclosed") : "exact",
      servingBasis: item.servingBasis ?? base.formula.caffeineServingBasis ?? base.formula.servingSize ?? "full serving",
      blendName: blend?.name ?? null,
      blendTotal: blend?.totalAmount ?? null,
      blendTotalUnit: blend?.unit ?? null,
      labelOrder,
      roles: item.roles,
      sourceIds: item.sourceIds,
      confidence: item.verified ? "high" : "medium",
    };
  });
  const partialServingMultiplier = /2 scoops|full cap/i.test(base.formula.servingSize ?? "") ? 0.5 : null;
  const partialServings = partialServingMultiplier
    ? [{
        label: /cap/i.test(base.formula.servingSize ?? "") ? "Half cap" : "1 scoop",
        multiplier: partialServingMultiplier,
        ingredients: fullServing.map((item) => ({
          ...item,
          amount: item.amount === null ? null : round(item.amount * partialServingMultiplier),
          servingBasis: /cap/i.test(base.formula.servingSize ?? "") ? "half cap" : "1 scoop",
        })),
      }]
    : [];
  const stimulantIntensity = intensity(base.formula.totalCaffeineMg, base.formula.stimulantFree);
  const variants = (raw?.variants ?? []).map((variant) => ({
    variantId: variant.id,
    flavor: variant.flavor ?? "Unflavored",
    sku: variant.item ?? "",
    stockStatus: soldOutVariantIds.has(variant.id) || variant.hidden || variant.available === false || variant.status === "inactive"
      ? "sold-out" as const
      : variant.status === "coming-soon"
        ? "coming-soon" as const
        : "available" as const,
    visibility: variant.hidden ? "hidden" as const : "visible" as const,
    limited: Boolean(variant.limited),
    runningLow: Boolean(variant.runningLow),
    wholesalePrice: Number(variant.wholesaleValue ?? 0),
    mapPrice: Number(variant.mapValue ?? 0),
  }));
  const type = inferProductType(base.productId);
  const exactCount = fullServing.filter((ingredient) => ingredient.amountStatus === "exact").length;
  const formulaTransparency = fullServing.some((ingredient) => ingredient.amountStatus === "proprietary_unknown")
    ? exactCount ? "partially-transparent" as const : "proprietary" as const
    : "fully-transparent" as const;
  const caffeineSources = fullServing
    .filter((ingredient) => ingredient.roles.includes("stimulant") && /caffeine|cafe alatus|infinergy/i.test(ingredient.name))
    .map((ingredient) => ingredient.name);
  const overlap = fullServing.map((ingredient) => ingredient.normalizedName);
  const extras = productExtras[base.productId] ?? {};
  const product: CanonicalProduct = {
    id: base.productId,
    brandId: "blackmarketlabs",
    officialName: raw?.title ?? base.shortName,
    shortName: base.shortName,
    slug: raw?.handle ?? base.productId,
    aliases: unique(base.aliases.map(normalize)),
    commonMisspellings: unique(base.commonMisspellings ?? []),
    category: raw?.category ?? categoryFromGoals(base.goals),
    subcategory: raw?.categorySlug ?? base.goals[0] ?? "products",
    productType: type,
    format: type === "capsule" ? "capsules" : type === "liquid" ? "liquid" : "powder",
    status: variants.length ? "active" : "catalog-only",
    featured: Boolean(raw?.featured),
    hidden: Boolean(raw?.hidden),
    comingSoon: variants.length > 0 && variants.every((variant) => variant.stockStatus === "coming-soon"),
    limited: variants.some((variant) => variant.limited),
    runningLow: variants.some((variant) => variant.runningLow),
    primaryGoal: goalName(base.goals[0] ?? "performance"),
    secondaryGoals: base.goals.slice(1).map(goalName),
    shortDescription: base.purpose,
    wholesaleSummary: base.retailerPitch,
    retailerSalesPitch: base.retailerPitch,
    keyDifferentiators: base.keyDifferentiators,
    bestFor: base.bestFor,
    notIdealFor: base.notIdealFor,
    targetCustomer: base.bestFor.join("; "),
    suggestedStaffExplanation: staffExplanation(base.shortName, base.purpose, base.keyDifferentiators),
    suggestedRetailerTalkingPoints: unique([base.retailerPitch, ...base.keyDifferentiators]),
    servingSize: base.formula.servingSize ?? null,
    servingsPerContainer: base.formula.servingsPerContainer ?? null,
    calories: extras.calories ?? null,
    fullServing,
    partialServings,
    proprietaryBlends: blendDefinitions.map((blend) => ({
      ...blend,
      ingredients: fullServing.filter((ingredient) => ingredient.blendName === blend.name).map((ingredient) => ingredient.name),
      sourceIds: sourceReferences,
    })),
    otherIngredients: explicitOtherIngredients[base.productId] ?? [],
    totalCaffeineMg: base.formula.totalCaffeineMg ?? null,
    totalCaffeineStatus: base.formula.stimulantFree
      ? "none"
      : base.formula.totalCaffeineMg === undefined
        ? "not-confirmed"
        : "official-total",
    caffeineSources,
    stimulantFree: base.formula.stimulantFree,
    stimulantIntensity,
    pumpProfile: profileText(base, "pump"),
    focusProfile: profileText(base, "focus"),
    thermogenicProfile: profileText(base, "thermogenic"),
    strengthProfile: profileText(base, "strength"),
    enduranceProfile: profileText(base, "performance"),
    formulaTransparency,
    beginnerSuitability: stimulantIntensity === "none" || stimulantIntensity === "low"
      ? "More approachable from a stimulant standpoint; buyers still need to review the full label and directions."
      : stimulantIntensity === "moderate"
        ? "Moderate-stimulant positioning; start with the labeled minimum serving where one is provided."
        : "Not positioned as a beginner stimulant product.",
    advancedUserSuitability: stimulantIntensity === "high" || stimulantIntensity === "very-high"
      ? "Designed for experienced stimulant users who understand their tolerance."
      : "Useful for advanced users when its formula goal matches the training need.",
    dailyUseSuitability: base.goals.includes("daily")
      ? "Officially positioned for consistent or daily use; follow the label and account for ingredient overlap."
      : "Not specifically positioned as an everyday product; follow label directions and review stimulant overlap.",
    lateNightSuitability: base.formula.stimulantFree
      ? "The formula is stimulant-free, making it the line’s more relevant late-day option; individual ingredients and tolerance still matter."
      : `Not the preferred late-night option because the full serving lists ${base.formula.totalCaffeineMg ?? "unconfirmed"} mg caffeine.`,
    naturalOrArtificialFlavors: extras.naturalOrArtificialFlavors ?? "Varies by flavor; check the current variant label.",
    colorsAndSweeteners: extras.colorsAndSweeteners ?? "Varies by flavor; check the current variant label.",
    directions: directionsFor(base),
    warnings: unique([
      ...(base.formula.warnings ?? []),
      "Use only as directed on the current label.",
      ...(base.formula.stimulantFree ? [] : ["Account for caffeine and other stimulant sources before stacking."]),
    ]),
    stackingCompatibility: stackCompatibility(base),
    overlappingIngredients: overlap,
    relatedProducts: base.relationships.commonlyComparedWith,
    alternatives: base.relationships.substitutes,
    upgrades: inferUpgrades(base.productId),
    downgrades: inferDowngrades(base.productId),
    searchTags: unique([
      ...base.aliases,
      ...(base.commonMisspellings ?? []),
      ...base.goals,
      ...fullServing.flatMap((ingredient) => [ingredient.name, ingredient.normalizedName, ...ingredient.roles]),
    ].map(normalize)),
    flavors: variants,
    verificationStatus: base.verification,
    sourceReferences,
    conflicts: base.formula.reviewNotes ?? [],
    lastVerifiedAt: VERIFIED_AT,
  };
  return { ...product, ...extras, fullServing, partialServings, flavors: variants } as CanonicalProduct;
}

function buildSources(): CanonicalSource[] {
  const entries: CanonicalSource[] = [{
    id: "official-2026-catalog",
    title: "BLACKMARKET 2026 Product Catalog",
    type: "official-catalog",
    location: "public/assets/BlackMarketLabs_Product_Catalog.pdf",
    accessedAt: VERIFIED_AT,
    priority: 90,
    confidence: "high",
  }, {
    id: "portal-catalog",
    title: "Wholesale portal catalog",
    type: "portal-catalog",
    location: "public/catalog-data.json",
    accessedAt: VERIFIED_AT,
    priority: 80,
    confidence: "high",
    notes: ["Authoritative for wholesale variants, item numbers, prices, and portal status."],
  }];
  for (const base of PRODUCT_KNOWLEDGE) {
    for (const source of base.sources) {
      entries.push({
        id: source.id,
        title: `${base.shortName} ${source.type.replaceAll("-", " ")}`,
        type: source.type === "supplement-facts-image"
          ? "supplement-facts-label"
          : source.type === "official-product-page"
            ? "official-product-page"
            : source.type === "catalog-record"
              ? "portal-catalog"
              : "official-catalog",
        location: source.location,
        accessedAt: VERIFIED_AT,
        priority: source.type === "supplement-facts-image" ? 100 : source.type === "official-product-page" ? 70 : 85,
        confidence: "high",
        notes: source.note ? [source.note] : undefined,
      });
    }
    if (currentLabelById[base.productId]) {
      entries.push({
        id: `${base.productId}:current-label`,
        title: `${base.shortName} current Supplement Facts label`,
        type: "supplement-facts-label",
        location: currentLabelById[base.productId],
        accessedAt: VERIFIED_AT,
        priority: 100,
        confidence: "high",
        notes: ["Current label supersedes older formula pages where values conflict."],
      });
    }
    if (officialPageById[base.productId]) {
      entries.push({
        id: `${base.productId}:official-page`,
        title: `${base.shortName} official product page`,
        type: "official-product-page",
        location: officialPageById[base.productId],
        accessedAt: VERIFIED_AT,
        priority: 70,
        confidence: "high",
        notes: ["Used for official purpose, positioning, current consumer flavors, and official caffeine totals when stated."],
      });
    }
    entries.push({
      id: `${base.productId}:portal-catalog`,
      title: `${base.shortName} wholesale catalog record`,
      type: "portal-catalog",
      location: `public/catalog-data.json#${base.productId}`,
      accessedAt: VERIFIED_AT,
      priority: 80,
      confidence: "high",
    });
  }
  entries.push(
    researchSource("research-creatine-issn", "ISSN position stand: creatine supplementation", "https://pmc.ncbi.nlm.nih.gov/articles/PMC5469049/"),
    researchSource("research-beta-alanine-issn", "ISSN position stand: beta-alanine", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4501114/"),
    researchSource("research-caffeine-issn", "ISSN position stand: caffeine and exercise performance", "https://pmc.ncbi.nlm.nih.gov/articles/PMC7777221/"),
    researchSource("research-hmb-issn", "ISSN position stand: beta-hydroxy-beta-methylbutyrate", "https://pmc.ncbi.nlm.nih.gov/articles/PMC4019830/"),
  );
  return uniqueBy(entries, (entry) => entry.id);
}

function researchSource(id: string, title: string, location: string): CanonicalSource {
  return { id, title, type: "research-paper", location, accessedAt: VERIFIED_AT, priority: 60, confidence: "high" };
}

const ingredientGuidance: Record<string, {
  whatItIs: string;
  howItWorks: string;
  whyIncluded: string;
  range?: [number, number, "mg" | "g", string, string];
  limitations?: string[];
  sideEffects?: string[];
  related?: string[];
  synergy?: string[];
}> = {
  "creatine monohydrate": {
    whatItIs: "A well-studied dietary source of creatine used to increase muscle phosphocreatine stores.",
    howItWorks: "Higher phosphocreatine availability supports rapid ATP regeneration during repeated high-intensity work.",
    whyIncluded: "Strength, power-output, and training-capacity positioning.",
    range: [3, 5, "g", "Common daily maintenance range in the ISSN position stand.", "research-creatine-issn"],
    limitations: ["Research dosing is generally daily and should not be treated as a promise about an individual product outcome."],
    sideEffects: ["Water-weight gain and gastrointestinal discomfort can occur for some users."],
    related: ["creatine anhydrous"],
    synergy: ["beta alanine", "betaine anhydrous"],
  },
  "beta alanine": {
    whatItIs: "An amino acid used to raise muscle carnosine over repeated daily use.",
    howItWorks: "Muscle carnosine contributes to buffering acidity during high-intensity efforts.",
    whyIncluded: "High-intensity endurance and repeated-effort positioning.",
    range: [4, 6, "g", "Daily range summarized by the ISSN position stand; some labels use 3.2 g as a common practical serving.", "research-beta-alanine-issn"],
    limitations: ["The evidence concerns repeated daily intake, not only the immediate pre-workout serving."],
    sideEffects: ["Temporary tingling (paresthesia) is common, especially with larger single doses."],
    synergy: ["creatine monohydrate"],
  },
  "l citrulline": {
    whatItIs: "An amino acid used in pump and nitric-oxide-oriented formulas.",
    howItWorks: "It can increase circulating arginine availability, which supports nitric oxide production.",
    whyIncluded: "Pump, blood-flow, and training-performance positioning.",
    range: [6, 8, "g", "Common range used in sports-nutrition studies for pure L-citrulline; study protocols vary.", "official-2026-catalog"],
    limitations: ["Pure L-citrulline cannot be compared one-for-one with citrulline malate without knowing the malate ratio."],
    sideEffects: ["Gastrointestinal discomfort is possible at larger amounts."],
    related: ["citrulline malate", "arginine nitrate"],
    synergy: ["nitrates", "pink himalayan salt"],
  },
  "caffeine anhydrous": {
    whatItIs: "A concentrated, fast-acting form of caffeine.",
    howItWorks: "Caffeine antagonizes adenosine receptors and is used for alertness and performance positioning.",
    whyIncluded: "Energy, alertness, focus, and training-intensity positioning.",
    range: [3, 6, "mg", "Research often expresses an effective performance range per kilogram of body weight, not as one fixed product dose.", "research-caffeine-issn"],
    limitations: ["A mg/kg research range cannot be evaluated from a product label without body weight.", "Caffeine materials such as di-caffeine malate are not necessarily 100% caffeine by material weight."],
    sideEffects: ["Sleep disruption, jitteriness, anxiety, elevated heart rate, and gastrointestinal discomfort can occur."],
    related: ["dicaffeine malate", "cafe alatus", "natural caffeine"],
    synergy: ["l theanine"],
  },
  "calcium hmb": {
    whatItIs: "A calcium salt of beta-hydroxy-beta-methylbutyrate, a leucine metabolite.",
    howItWorks: "HMB is studied in relation to muscle-protein breakdown and adaptation, especially under demanding training conditions.",
    whyIncluded: "Muscle-preservation and recovery positioning in strength formulas.",
    range: [3, 3, "g", "Common daily amount discussed in the ISSN position stand.", "research-hmb-issn"],
    limitations: ["Research outcomes vary by training status, protocol, and total daily use."],
    synergy: ["creatine monohydrate"],
  },
  "betaine anhydrous": {
    whatItIs: "A methyl donor and osmolyte also called trimethylglycine.",
    howItWorks: "It is used for cellular-hydration and power-output positioning.",
    whyIncluded: "Strength, power, hydration, and performance support.",
    range: [2.5, 2.5, "g", "A common daily amount in exercise studies; protocols vary.", "official-2026-catalog"],
    limitations: ["A research amount does not establish the effect of the finished multi-ingredient formula."],
    sideEffects: ["Gastrointestinal discomfort is possible."],
    synergy: ["creatine monohydrate", "taurine"],
  },
  "l tyrosine": {
    whatItIs: "An amino acid precursor used in focus-oriented formulas.",
    howItWorks: "Tyrosine is a precursor to catecholamine neurotransmitters and is studied under demanding or stressful conditions.",
    whyIncluded: "Focus, alertness, and cognitive-performance positioning.",
    limitations: ["Evidence is context-dependent and branded extract percentages matter."],
    synergy: ["alpha gpc", "l theanine"],
  },
  "alpha gpc": {
    whatItIs: "A choline-containing compound; some labels specify a 50% Alpha GPC material.",
    howItWorks: "It supplies choline used in acetylcholine synthesis.",
    whyIncluded: "Focus and mind-muscle-connection positioning.",
    limitations: ["A 600 mg amount of Alpha GPC 50% material is not the same as 600 mg active Alpha GPC."],
    synergy: ["l tyrosine", "uridine monophosphate"],
  },
  "l theanine": {
    whatItIs: "An amino acid naturally present in tea.",
    howItWorks: "It is commonly paired with caffeine in formulas intended to balance stimulation with a smoother focus profile.",
    whyIncluded: "Focused-energy and stimulant-balancing positioning.",
    synergy: ["caffeine anhydrous"],
  },
  "taurine": {
    whatItIs: "A sulfur-containing amino acid-like compound found in excitable tissues.",
    howItWorks: "It is used in hydration, cellular-volume, and performance formulas.",
    whyIncluded: "Hydration and training-performance positioning.",
    sideEffects: ["Gastrointestinal discomfort is possible for some users."],
  },
  "l carnitine tartrate": {
    whatItIs: "A tartrate salt of L-carnitine used in performance and thermogenic-positioned products.",
    howItWorks: "Carnitine participates in fatty-acid transport, but acute product claims should not be inferred from that biological role alone.",
    whyIncluded: "Thermogenic, recovery, and performance positioning.",
    limitations: ["Different carnitine forms and study durations are not directly interchangeable."],
    related: ["acetyl l carnitine hcl", "l carnitine fumarate", "l carnitine"],
  },
};

function buildIngredients(productRecords: CanonicalProduct[], sourceRecords: CanonicalSource[]): CanonicalIngredient[] {
  const byId = new Map<string, CanonicalIngredient>();
  for (const product of productRecords) {
    for (const amount of product.fullServing) {
      const id = amount.ingredientId;
      const guidance = ingredientGuidance[amount.normalizedName];
      const existing = byId.get(id);
      const sourceReferences = unique([...(existing?.sourceReferences ?? []), ...amount.sourceIds]);
      const productsContaining = [
        ...(existing?.productsContaining ?? []),
        {
          productId: product.id,
          amount: amount.amount,
          unit: amount.unit,
          amountStatus: amount.amountStatus,
          reachesReferencedRange: reachesRange(amount, guidance?.range),
        },
      ];
      byId.set(id, {
        id,
        name: existing?.name ?? amount.name,
        normalizedName: amount.normalizedName,
        aliases: unique([amount.normalizedName, amount.name, ...(existing?.aliases ?? [])]),
        roles: unique([...(existing?.roles ?? []), ...amount.roles]),
        whatItIs: guidance?.whatItIs ?? `${amount.name} is an ingredient disclosed on one or more current BLACKMARKET product labels.`,
        howItWorks: guidance?.howItWorks ?? "The canonical source set does not contain enough high-confidence research detail to make a more specific mechanism statement.",
        whyIncluded: guidance?.whyIncluded ?? `It is used in formulas where the label assigns ${amount.roles.join(", ") || "product-support"} positioning.`,
        evidenceSupportedRanges: guidance?.range
          ? [{
              minimum: guidance.range[0],
              maximum: guidance.range[1],
              unit: guidance.range[2],
              context: guidance.range[3],
              sourceIds: [guidance.range[4]],
            }]
          : [],
        evidenceLimitations: unique([
          "Finished-product effects cannot be inferred from one ingredient in isolation.",
          ...(amount.amountStatus === "proprietary_unknown" ? ["This ingredient is inside a proprietary blend, so its individual amount cannot be compared with a research range."] : []),
          ...(guidance?.limitations ?? []),
        ]),
        possibleSideEffects: guidance?.sideEffects ?? ["No product-specific side-effect statement is stored; consult the current label warnings."],
        relatedIngredients: guidance?.related ?? [],
        synergisticIngredients: guidance?.synergy ?? [],
        overlappingIngredients: [],
        productsContaining,
        sourceReferences,
      });
    }
  }
  return [...byId.values()].map((ingredient) => ({
    ...ingredient,
    overlappingIngredients: unique(productRecords
      .filter((product) => product.fullServing.some((amount) => amount.ingredientId === ingredient.id))
      .flatMap((product) => product.fullServing.map((amount) => amount.ingredientId))
      .filter((id) => id !== ingredient.id)),
    sourceReferences: ingredient.sourceReferences.filter((id) => sourceRecords.some((source) => source.id === id) || id.includes(":label") || id.includes(":guide")),
  })).sort((a, b) => a.name.localeCompare(b.name));
}

const dedicatedVerdicts: Record<string, { verdict: string; experience: string; bottomLine: string }> = {
  "defy-hyper-stimulant|rule-hyper-focus": {
    verdict: "DEFY is the more complete performance-and-pump formula; RULE is the more cognition-heavy hyper-focus formula.",
    experience: "At full serving, DEFY puts more weight behind pump and output with 10 g L-Citrulline and 5 g betaine. RULE shifts more of the formula toward cognition with 3 g L-Tyrosine, Lion’s Mane, Uridine, Theobromine, Alpha GPC, and a broader focus stack.",
    bottomLine: "Choose DEFY when pump, betaine, and all-around training performance lead the sale. Choose RULE when the buyer specifically wants the deepest focus/nootropic experience and accepts RULE’s very-high stimulant position.",
  },
  "bulk-testosterone-pre-workout|cuts-thermogenic-pre-workout": {
    verdict: "CUTS is the thermogenic/cutting pre-workout; BULK is the strength-and-size pre-workout.",
    experience: "Both disclose 300 mg caffeine, but their proprietary matrices point in different directions. CUTS centers L-carnitine forms, agmatine, caffeine, bitter orange, and other thermogenic-positioned ingredients. BULK centers creatine, D-Aspartic Acid, betaine, beta-alanine, agmatine, stimulant energy, and strength/testosterone-support positioning.",
    bottomLine: "Use CUTS for the shopper whose primary goal is a thermogenic pre-workout. Use BULK for the shopper who wants strength, size, creatine, and power positioning. Neither label discloses every individual blend amount.",
  },
  "cuts-thermogenic-pre-workout|tone-weight-loss-pre-workout": {
    verdict: "CUTS is the more aggressive general thermogenic pre-workout; TONE is the women-positioned weight-management formula with a broader antioxidant and CLA story.",
    experience: "Both disclose 300 mg caffeine and use proprietary blends. CUTS is built around its Fat Burning Matrix and a direct thermogenic-pre-workout experience. TONE divides the label into an Energy Focus Blend and a Weight Loss/Antioxidant Blend with CLA, carnitine, citrulline malate, green coffee, green tea, fruit extracts, vitamins, and minerals.",
    bottomLine: "Choose CUTS for the established, direct thermogenic pre-workout sale. Choose TONE when the buyer wants women-oriented weight-management positioning, CLA, vitamins, and antioxidant ingredients—while being clear that most individual blend dosages are not disclosed.",
  },
  "bulk-apex-strength-pre-workout|bulk-testosterone-pre-workout": {
    verdict: "BULK APEX is the transparent premium strength upgrade; BULK is the lower-price proprietary classic.",
    experience: "BULK APEX discloses 5 g creatine, 5 g beta-alanine, 3 g Calcium HMB, 2.5 g betaine, 150 mg elevATP, taurine, tyrosine, and an official 400 mg total caffeine. BULK discloses a 9,240 mg matrix and 300 mg caffeine but does not reveal the individual creatine, D-Aspartic Acid, betaine, or beta-alanine amounts.",
    bottomLine: "Choose APEX when exact strength-formula doses and a premium upsell matter. Choose BULK when the buyer wants the classic strength position at a lower MAP and accepts a proprietary blend.",
  },
  "nitricoxide-stim-free-pre-workout|pump-hyper-pump-pre-workout": {
    verdict: "PUMP is the maximum dedicated pump formula; NITRICOXIDE is the more rounded stimulant-free pump, focus, and endurance formula.",
    experience: "PUMP leads with 8 g L-Citrulline plus 2 g betaine nitrate and 1 g arginine nitrate, backed by betaine, taurine, and salt. NITRICOXIDE uses 5 g L-Citrulline with watermelon powder, a 1 g mushroom blend, CitraPeak, pine bark, tyrosine, and ginkgo.",
    bottomLine: "Choose PUMP when the customer wants nitrates and the strongest pump-specific profile. Choose NITRICOXIDE when they want a stimulant-free pre-workout with pump plus more focus/endurance positioning.",
  },
};

const requestedPairs: Array<[string, string]> = [
  ["defy-hyper-stimulant", "rule-hyper-focus"],
  ["defy-hyper-stimulant", "underground-high-stimulant"],
  ["rule-hyper-focus", "underground-high-stimulant"],
  ["rule-hyper-focus", "nootropic-high-focus-pre-workout"],
  ["nootropic-high-focus-pre-workout", "bump-laser-focus-nootropic"],
  ["cuts-thermogenic-pre-workout", "bulk-testosterone-pre-workout"],
  ["cuts-thermogenic-pre-workout", "tone-weight-loss-pre-workout"],
  ["cuts-thermogenic-pre-workout", "cuts-natural-thermogenic-pre-workout"],
  ["cuts-thermogenic-pre-workout", "cuts-diamond-ultra-thermogenic"],
  ["cuts-thermogenic-pre-workout", "cuts-heat-stim-free-thermogenic"],
  ["cuts-thermogenic-pre-workout", "scorch-ultra-thermogenic"],
  ["cuts-thermogenic-pre-workout", "cuts-pills-thermogenic-capsules"],
  ["bulk-testosterone-pre-workout", "bulk-apex-strength-pre-workout"],
  ["bulk-testosterone-pre-workout", "bulk-pills-testosterone-capsules"],
  ["bulk-apex-strength-pre-workout", "creatine-monohydrate-raw"],
  ["pump-hyper-pump-pre-workout", "nitricoxide-stim-free-pre-workout"],
  ["pump-hyper-pump-pre-workout", "cuts-pump-thermogenic-liquid-glycerol"],
  ["cuts-diamond-ultra-thermogenic", "scorch-ultra-thermogenic"],
  ["cuts-heat-stim-free-thermogenic", "cuts-pump-thermogenic-liquid-glycerol"],
  ["rule-hyper-focus", "bump-laser-focus-nootropic"],
];

function buildComparisons(productRecords: CanonicalProduct[]): CanonicalComparison[] {
  const pairs = uniqueBy([
    ...requestedPairs,
    ...productRecords.flatMap((product) => product.relatedProducts.map((other) => [product.id, other] as [string, string])),
  ], ([a, b]) => pairKey(a, b));
  return pairs.flatMap(([firstId, secondId]) => {
    const first = productById.get(firstId);
    const second = productById.get(secondId);
    if (!first || !second || first.id === second.id) return [];
    const key = pairKey(first.id, second.id);
    const dedicated = dedicatedVerdicts[key];
    const overlaps = intersection(first.overlappingIngredients, second.overlappingIngredients);
    const formulaDifferences = buildFormulaDifferences(first, second);
    const directVerdict = dedicated?.verdict ?? `${first.shortName} is the better fit for ${first.primaryGoal.toLowerCase()}, while ${second.shortName} is the better fit for ${second.primaryGoal.toLowerCase()}.`;
    return [{
      id: key,
      productIds: [first.id, second.id],
      title: `${first.shortName} vs ${second.shortName}`,
      directVerdict,
      majorFormulaDifferences: formulaDifferences,
      experience: dedicated?.experience ?? `${first.shortName}: ${first.suggestedStaffExplanation} ${second.shortName}: ${second.suggestedStaffExplanation}`,
      chooseFirstWhen: first.bestFor,
      chooseSecondWhen: second.bestFor,
      tradeoffs: [
        `${first.shortName}: ${first.notIdealFor.join("; ") || "Review the full formula and customer preference."}`,
        `${second.shortName}: ${second.notIdealFor.join("; ") || "Review the full formula and customer preference."}`,
        ...proprietaryTradeoffs(first, second),
      ],
      overlappingIngredients: overlaps,
      bottomLine: dedicated?.bottomLine ?? `Match the recommendation to the buyer’s primary goal: ${first.shortName} for ${first.primaryGoal.toLowerCase()}; ${second.shortName} for ${second.primaryGoal.toLowerCase()}.`,
      sourceReferences: unique([...first.sourceReferences, ...second.sourceReferences]),
    } satisfies CanonicalComparison];
  });
}

function buildFaqs(product: CanonicalProduct): CanonicalFaq[] {
  const strongest = strongestIngredients(product, 6);
  const custom: Array<[string, string, string[]]> = [
    [`What is ${product.shortName}?`, product.shortDescription, ["overview"]],
    [`What is ${product.shortName} designed for?`, `${product.shortName} is positioned primarily for ${product.primaryGoal.toLowerCase()}. ${product.shortDescription}`, ["purpose"]],
    [`Who is ${product.shortName} best for?`, product.bestFor.join("; ") || "Match the formula to the buyer’s stated goal.", ["customer"]],
    [`Who is ${product.shortName} not ideal for?`, product.notIdealFor.join("; ") || "Review the current label, stimulant preference, and product goal.", ["customer"]],
    [`Is ${product.shortName} stimulant-free?`, product.stimulantFree ? "Yes. The current formula does not list caffeine." : `No. ${caffeineSentence(product)}`, ["stimulant"]],
    [`How much caffeine is in ${product.shortName}?`, caffeineSentence(product), ["caffeine"]],
    [`What are the main ingredients in ${product.shortName}?`, strongest.join(", ") || "The current source set does not disclose formula details.", ["formula"]],
    [`Does ${product.shortName} use a proprietary blend?`, proprietaryAnswer(product), ["transparency"]],
    [`Is every ${product.shortName} dosage disclosed?`, product.formulaTransparency === "fully-transparent" ? "Yes, the active formula is fully disclosed in the current canonical label record." : "No. One or more ingredients are inside a proprietary blend or otherwise lack an individual disclosed amount.", ["transparency"]],
    [`What is the serving size for ${product.shortName}?`, product.servingSize ? `${product.servingSize}.` : "The current verified source set does not confirm a serving size.", ["serving"]],
    [`How many servings are in ${product.shortName}?`, product.servingsPerContainer ? `${product.servingsPerContainer} full servings per container.` : "The current verified source set does not confirm the number of servings.", ["serving"]],
    [`Is ${product.shortName} beginner-friendly?`, product.beginnerSuitability, ["beginner"]],
    [`Is ${product.shortName} for experienced users?`, product.advancedUserSuitability, ["advanced"]],
    [`Can ${product.shortName} be used late at night?`, product.lateNightSuitability, ["late-night"]],
    [`Is ${product.shortName} positioned for daily use?`, product.dailyUseSuitability, ["daily"]],
    [`What does ${product.shortName} feel like?`, experienceSummary(product), ["experience"]],
    [`How should store staff explain ${product.shortName}?`, product.suggestedStaffExplanation, ["staff"]],
    [`What is the main selling point of ${product.shortName}?`, product.keyDifferentiators.join("; "), ["sales"]],
    [`What objection comes up with ${product.shortName}?`, product.notIdealFor[0] ?? "Review formula fit and stimulant preference.", ["objection"]],
    [`What products compare with ${product.shortName}?`, names(product.relatedProducts).join(", ") || "No dedicated comparison is stored.", ["comparison"]],
    [`What can replace ${product.shortName}?`, names(product.alternatives).join(", ") || "No direct substitute is stored.", ["substitute"]],
    [`What is an upgrade from ${product.shortName}?`, names(product.upgrades).join(", ") || "No formula upgrade is defined; compare by the buyer’s goal.", ["upgrade"]],
    [`What stacks with ${product.shortName}?`, product.stackingCompatibility.join("; "), ["stack"]],
    [`What overlaps when stacking ${product.shortName}?`, product.overlappingIngredients.slice(0, 12).join(", "), ["stack", "overlap"]],
    [`Does ${product.shortName} contain creatine?`, ingredientFaq(product, "creatine"), ["ingredient", "creatine"]],
    [`Does ${product.shortName} contain beta-alanine?`, ingredientFaq(product, "beta alanine"), ["ingredient", "beta-alanine"]],
    [`Does ${product.shortName} contain citrulline?`, ingredientFaq(product, "citrulline"), ["ingredient", "citrulline"]],
    [`Does ${product.shortName} contain HMB?`, ingredientFaq(product, "hmb"), ["ingredient", "hmb"]],
    [`Does ${product.shortName} contain nootropic ingredients?`, ingredientRoleFaq(product, "focus"), ["ingredient", "focus"]],
    [`Does ${product.shortName} contain nitrate ingredients?`, ingredientFaq(product, "nitrate"), ["ingredient", "nitrates"]],
    [`Does ${product.shortName} contain carnitine?`, ingredientFaq(product, "carnitine"), ["ingredient", "carnitine"]],
    [`Does ${product.shortName} contain bitter orange?`, ingredientFaq(product, "bitter orange"), ["ingredient"]],
    [`Does ${product.shortName} use natural flavors?`, product.naturalOrArtificialFlavors, ["flavors", "label"]],
    [`What sweeteners or colors does ${product.shortName} use?`, product.colorsAndSweeteners, ["label"]],
    [`What flavors of ${product.shortName} are orderable?`, product.flavors.filter((variant) => variant.stockStatus === "available" && variant.visibility === "visible").map((variant) => variant.flavor).join(", ") || "No current variants are orderable.", ["flavors", "stock"]],
    [`Is ${product.shortName} in stock?`, stockAnswer(product), ["stock"]],
    [`What is the MAP for ${product.shortName}?`, priceAnswer(product, "map"), ["pricing"]],
    [`What is the wholesale price for ${product.shortName}?`, priceAnswer(product, "wholesale"), ["pricing"]],
    [`What is the retailer margin on ${product.shortName}?`, marginAnswer(product), ["pricing", "margin"]],
    [`What should staff avoid claiming about ${product.shortName}?`, "Do not claim that the product diagnoses, treats, cures, or prevents a disease, and do not present a proprietary ingredient amount as known.", ["compliance"]],
    [`What is the bottom-line pitch for ${product.shortName}?`, `${product.retailerSalesPitch} The clearest differentiators are ${product.keyDifferentiators.join("; ")}.`, ["sales"]],
  ];
  return custom.map(([question, answer, tags], index) => ({
    id: `${product.id}:faq:${String(index + 1).padStart(2, "0")}`,
    productId: product.id,
    question,
    answer,
    tags,
    sourceReferences: product.sourceReferences,
  }));
}

function buildStacks(productRecords: CanonicalProduct[]) {
  const definitions: Array<[string, string, string]> = [
    ["cuts-thermogenic-pre-workout", "cuts-pump-thermogenic-liquid-glycerol", "Thermogenic pre-workout plus liquid pump"],
    ["cuts-heat-stim-free-thermogenic", "pump-hyper-pump-pre-workout", "Stimulant-free thermogenic plus dedicated pump"],
    ["defy-hyper-stimulant", "creatine-monohydrate-raw", "Hyper-performance pre-workout plus creatine"],
    ["rule-hyper-focus", "creatine-monohydrate-raw", "Hyper-focus pre-workout plus creatine"],
    ["underground-high-stimulant", "nitricoxide-stim-free-pre-workout", "High stimulant plus stimulant-free pump"],
    ["nootropic-high-focus-pre-workout", "l-citrulline-raw", "Focus pre-workout plus additional citrulline"],
    ["bulk-testosterone-pre-workout", "l-citrulline-raw", "Classic strength formula plus citrulline"],
    ["bulk-pills-testosterone-capsules", "pump-hyper-pump-pre-workout", "Capsule strength support plus stimulant-free pump"],
  ];
  return definitions.flatMap(([firstId, secondId, name]) => {
    const first = productRecords.find((product) => product.id === firstId);
    const second = productRecords.find((product) => product.id === secondId);
    if (!first || !second) return [];
    const overlaps = intersection(first.overlappingIngredients, second.overlappingIngredients);
    const caffeine = (first.totalCaffeineMg ?? 0) + (second.totalCaffeineMg ?? 0);
    const cautions = [
      ...(caffeine > 0 ? [`The listed full servings total ${caffeine} mg official caffeine before any other dietary sources.`] : []),
      ...(overlaps.length ? [`Overlapping disclosed ingredients: ${overlaps.join(", ")}.`] : []),
      "This is product education, not a statement that the combination is medically safe for an individual.",
    ];
    return [{
      id: pairKey(first.id, second.id),
      productIds: [first.id, second.id],
      name,
      positioning: `${first.shortName} supplies ${first.primaryGoal.toLowerCase()} positioning while ${second.shortName} adds ${second.primaryGoal.toLowerCase()} positioning.`,
      overlaps,
      cautions,
      retailerExplanation: `Explain the roles separately, check duplicate stimulants and actives, and have the buyer follow both labels rather than treating the combination as one serving.`,
      sourceReferences: unique([...first.sourceReferences, ...second.sourceReferences]),
    }];
  });
}

function buildSales(productRecords: CanonicalProduct[]): SalesRecommendation[] {
  const available = productRecords.filter((product) => product.flavors.some((variant) => variant.stockStatus === "available"));
  const rules: Array<[string, string[], (product: CanonicalProduct) => number, string]> = [
    ["strongest-pre-workout", ["strongest", "high stim", "maximum energy"], (product) => (product.totalCaffeineMg ?? 0) + (product.stimulantIntensity === "very-high" ? 100 : 0), "Highest official caffeine and hyper-stimulant positioning"],
    ["highest-focus", ["focus", "nootropic", "locked in"], (product) => ingredientRoleCount(product, "focus") * 100 + (product.totalCaffeineMg ?? 0), "Broad disclosed focus profile"],
    ["maximum-pump", ["pump", "blood flow", "vascularity"], (product) => ingredientRoleAmount(product, "pump"), "Strongest disclosed pump profile"],
    ["fat-loss", ["fat loss", "thermogenic", "cutting"], (product) => product.thermogenicProfile.includes("does not") ? 0 : ingredientRoleCount(product, "thermogenic") * 100, "Thermogenic category and disclosed actives"],
    ["stim-free-fat-loss", ["stim free fat loss", "non stim thermogenic"], (product) => product.stimulantFree && product.secondaryGoals.some((goal) => /cut/i.test(goal)) ? 1000 : 0, "Stimulant-free thermogenic position"],
    ["late-night", ["late night", "night training"], (product) => product.stimulantFree ? ingredientRoleAmount(product, "pump") + 1000 : 0, "Stimulant-free training option"],
    ["beginner", ["beginner", "new to pre workout"], (product) => product.stimulantIntensity === "low" ? 1000 : product.stimulantFree ? 900 : 0, "Lower stimulant burden"],
    ["capsule", ["capsule", "pills"], (product) => product.productType === "capsule" ? 1000 : 0, "Capsule format"],
    ["natural-sweeteners", ["natural sweetener", "stevia", "natural flavors"], (product) => /stevia|natural/i.test(product.colorsAndSweeteners) ? 1000 : 0, "Natural flavor/color/sweetener label"],
    ["strength", ["strength", "mass", "power"], (product) => ingredientRoleAmount(product, "strength"), "Strength-oriented formula"],
    ["beta-alanine-sensitive", ["no beta alanine", "beta alanine sensitivity"], (product) => hasIngredient(product, "beta alanine") ? 0 : 1000, "No beta-alanine listed"],
    ["women-oriented", ["women", "female", "tone"], (product) => product.id === "tone-weight-loss-pre-workout" ? 1000 : 0, "Official women-oriented product position"],
  ];
  return rules.map(([id, tags, score, reason]) => {
    const ranked = available.map((product) => ({ product, score: score(product) })).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
    return {
      id,
      queryTags: tags,
      verdict: ranked.length ? `${ranked[0].product.shortName} is the leading match for this request based on verified formula and positioning fields.` : "No currently available product meets this rule.",
      rankedProductIds: ranked.map((entry) => entry.product.id),
      reasons: Object.fromEntries(ranked.map((entry) => [entry.product.id, [reason, ...entry.product.keyDifferentiators.slice(0, 2)]])),
      exclusions: ["Unavailable and hidden variants are not recommended.", "Recommendations describe product positioning, not medical suitability."],
    };
  });
}

function buildRetrievalChunks(
  productRecords: CanonicalProduct[],
  ingredientRecords: CanonicalIngredient[],
  comparisonRecords: CanonicalComparison[],
  faqs: CanonicalFaq[],
  stackRecords: ReturnType<typeof buildStacks>,
  salesRecords: SalesRecommendation[],
): RetrievalChunk[] {
  const chunks: RetrievalChunk[] = [];
  for (const product of productRecords) {
    chunks.push(chunk(`${product.id}:overview`, "product", [product.id], product.shortName, [
      product.shortDescription,
      product.retailerSalesPitch,
      `Best for: ${product.bestFor.join("; ")}`,
      `Not ideal for: ${product.notIdealFor.join("; ")}`,
      `Differentiators: ${product.keyDifferentiators.join("; ")}`,
    ].join("\n"), product.sourceReferences, 90));
    chunks.push(chunk(`${product.id}:formula`, "formula", [product.id], `${product.shortName} formula`, [
      caffeineSentence(product),
      `Serving: ${product.servingSize ?? "not confirmed"}`,
      `Formula transparency: ${product.formulaTransparency}`,
      ...product.fullServing.map(formatIngredientAmount),
      ...product.proprietaryBlends.map((blend) => `${blend.name}: ${blend.totalAmount} ${blend.unit}; ${blend.ingredients.join(", ")}`),
    ].join("\n"), product.sourceReferences, 100));
  }
  for (const ingredient of ingredientRecords) {
    chunks.push(chunk(`ingredient:${ingredient.id}`, "ingredient", [ingredient.id, ...ingredient.productsContaining.map((item) => item.productId)], ingredient.name, [
      ingredient.whatItIs,
      ingredient.howItWorks,
      ingredient.whyIncluded,
      ...ingredient.productsContaining.map((item) => `${item.productId}: ${item.amount ?? "proprietary/unknown"} ${item.unit ?? ""}`),
    ].join("\n"), ingredient.sourceReferences, 85));
  }
  for (const comparison of comparisonRecords) {
    chunks.push(chunk(`comparison:${comparison.id}`, "comparison", comparison.productIds, comparison.title, [
      comparison.directVerdict,
      ...comparison.majorFormulaDifferences,
      comparison.experience,
      comparison.bottomLine,
    ].join("\n"), comparison.sourceReferences, 110));
  }
  for (const entry of faqs) chunks.push(chunk(entry.id, "faq", [entry.productId], entry.question, entry.answer, entry.sourceReferences, 65));
  for (const stack of stackRecords) chunks.push(chunk(`stack:${stack.id}`, "stack", stack.productIds, stack.name, [stack.positioning, ...stack.cautions, stack.retailerExplanation].join("\n"), stack.sourceReferences, 75));
  for (const sale of salesRecords) chunks.push(chunk(`sales:${sale.id}`, "sales", sale.rankedProductIds, sale.id, [sale.verdict, ...Object.values(sale.reasons).flat()].join("\n"), [], 70));
  return chunks;
}

function buildBenchmarks(productRecords: CanonicalProduct[], comparisonRecords: CanonicalComparison[]): AssistantBenchmark[] {
  const named: AssistantBenchmark[] = [
    benchmark("cuts-bulk", "What’s the difference between CUTS and BULK?", "compare_products", ["cuts-thermogenic-pre-workout", "bulk-testosterone-pre-workout"], ["thermogenic", "strength", "300 mg", "proprietary"], ["CUTS contains a disclosed dose of every ingredient"]),
    benchmark("cuts-tone", "CUTS vs TONE", "compare_products", ["cuts-thermogenic-pre-workout", "tone-weight-loss-pre-workout"], ["300 mg", "CLA", "proprietary"], ["TONE discloses every individual blend amount"]),
    benchmark("defy-rule", "DEFY vs RULE", "compare_products", ["defy-hyper-stimulant", "rule-hyper-focus"], ["10 g L-Citrulline", "5 g Betaine", "3 g L-Tyrosine", "Uridine"], ["both are simply focus-oriented"]),
    benchmark("citrulline-defy-rule", "Which has more L-Citrulline, DEFY or RULE?", "compare_products", ["defy-hyper-stimulant", "rule-hyper-focus"], ["DEFY", "10 g", "RULE", "5 g"], []),
    benchmark("uridine", "Which products contain Uridine?", "find_by_ingredient", ["rule-hyper-focus", "bump-laser-focus-nootropic"], ["RULE", "BUMP"], []),
    benchmark("bulk-creatine", "Does BULK disclose how much creatine it contains?", "find_by_ingredient", ["bulk-testosterone-pre-workout"], ["proprietary", "individual amount not disclosed"], ["5 g"]),
    benchmark("pump-nitric", "PUMP vs NITRICOXIDE", "compare_products", ["pump-hyper-pump-pre-workout", "nitricoxide-stim-free-pre-workout"], ["nitrate", "8 g", "5 g"], []),
    benchmark("stim-free-fat", "Which product is stimulant-free for fat loss?", "find_stimulant_free", ["cuts-heat-stim-free-thermogenic"], ["CUTS HEAT", "stimulant-free"], []),
    benchmark("five-creatine", "Which product has 5 grams of creatine?", "find_by_ingredient", ["bulk-apex-strength-pre-workout", "creatine-monohydrate-raw"], ["5 g"], []),
    benchmark("apex-creatine", "What makes BULK APEX different from creatine?", "compare_products", ["bulk-apex-strength-pre-workout", "creatine-monohydrate-raw"], ["HMB", "beta-alanine", "betaine", "400 mg"], []),
    benchmark("nitrates", "Which product uses nitrate ingredients?", "find_by_ingredient", ["pump-hyper-pump-pre-workout"], ["Betaine Nitrate", "Arginine Nitrate"], []),
    benchmark("cuts-natural-sweetener", "Does CUTS Natural use artificial sweeteners?", "explain_product", ["cuts-natural-thermogenic-pre-workout"], ["stevia", "natural"], ["sucralose"]),
    benchmark("late-night", "What is best for a late-night workout?", "find_by_goal", [], ["stimulant-free"], ["medically safe"]),
    benchmark("nitric-alias", "tell me about nitric oxide", "explain_product", ["nitricoxide-stim-free-pre-workout"], ["stimulant-free"], []),
    benchmark("cuts-natty-alias", "cuts natty ingredients", "explain_product", ["cuts-natural-thermogenic-pre-workout"], ["5626 mg", "proprietary"], []),
  ];
  const generated = [
    ...productRecords.flatMap((product) => [
      benchmark(`${product.id}:caffeine`, `How much caffeine is in ${product.shortName}?`, "rank_by_caffeine", [product.id], [product.stimulantFree ? "stimulant-free" : String(product.totalCaffeineMg ?? "does not confirm")], ["cures"]),
      benchmark(`${product.id}:formula`, `Give me the formula for ${product.shortName}`, "explain_product", [product.id], product.fullServing.slice(0, 2).map((ingredient) => ingredient.name), ["diagnoses"]),
      benchmark(`${product.id}:stock`, `Is ${product.shortName} available?`, "show_stock", [product.id], [], []),
      benchmark(`${product.id}:flavors`, `What flavors does ${product.shortName} come in?`, "show_flavors", [product.id], [], []),
    ]),
    ...comparisonRecords.slice(0, 35).map((comparison) => benchmark(
      `${comparison.id}:compare`,
      `Compare ${productById.get(comparison.productIds[0])?.shortName} and ${productById.get(comparison.productIds[1])?.shortName}`,
      "compare_products",
      comparison.productIds,
      comparison.directVerdict.split(/\s+/).filter((word) => word.length > 6).slice(0, 2),
      ["medically safe"],
    )),
  ];
  const all = uniqueBy([...named, ...generated], (item) => item.id);
  let index = 0;
  while (all.length < 160) {
    const product = productRecords[index % productRecords.length];
    all.push(benchmark(`generated:${index}`, `Does ${product.shortName} contain ${product.fullServing[index % product.fullServing.length]?.name ?? "caffeine"}?`, "find_by_ingredient", [product.id], [], ["invented dosage"]));
    index += 1;
  }
  return all;
}

function benchmark(id: string, question: string, expectedIntent: AssistantBenchmark["expectedIntent"], expectedProductIds: string[], requiredFacts: string[], forbiddenClaims: string[]): AssistantBenchmark {
  return { id, question, expectedIntent, expectedProductIds, requiredFacts, forbiddenClaims, responseType: expectedIntent === "compare_products" ? "comparison" : "answer" };
}

async function writeKnowledge(value: CanonicalKnowledge) {
  const folders = ["products", "ingredients", "comparisons", "stacks", "faq", "sales", "sources", "research", "exports"];
  await Promise.all(folders.map((folder) => mkdir(path.join(ROOT, "knowledge", folder), { recursive: true })));
  const outputs: Array<[string, unknown]> = [
    ["products.json", value.products],
    ["ingredients.json", value.ingredients],
    ["comparisons.json", value.comparisons],
    ["faq.json", value.faq],
    ["stacks.json", value.stacks],
    ["sales.json", value.sales],
    ["relationships.json", value.relationships],
    ["aliases.json", value.aliases],
    ["sources.json", value.sources],
    ["retrieval_chunks.json", value.retrievalChunks],
    ["benchmarks.json", value.benchmarks],
    ["knowledge.json", value],
  ];
  await Promise.all(outputs.map(([filename, data]) => writeFile(path.join(ROOT, "knowledge", "exports", filename), `${JSON.stringify(data, null, 2)}\n`)));
  await Promise.all(value.products.map((product) => writeFile(path.join(ROOT, "knowledge", "products", `${product.id}.json`), `${JSON.stringify(product, null, 2)}\n`)));
  await Promise.all(value.ingredients.map((ingredient) => writeFile(path.join(ROOT, "knowledge", "ingredients", `${ingredient.id}.json`), `${JSON.stringify(ingredient, null, 2)}\n`)));
  await Promise.all(value.comparisons.map((comparison) => writeFile(path.join(ROOT, "knowledge", "comparisons", `${comparison.id}.json`), `${JSON.stringify(comparison, null, 2)}\n`)));
  await Promise.all(value.stacks.map((stack) => writeFile(path.join(ROOT, "knowledge", "stacks", `${stack.id}.json`), `${JSON.stringify(stack, null, 2)}\n`)));
  await Promise.all(value.sales.map((sale) => writeFile(path.join(ROOT, "knowledge", "sales", `${sale.id}.json`), `${JSON.stringify(sale, null, 2)}\n`)));
  await Promise.all(value.products.map((product) => writeFile(
    path.join(ROOT, "knowledge", "faq", `${product.id}.json`),
    `${JSON.stringify(value.faq.filter((entry) => entry.productId === product.id), null, 2)}\n`,
  )));
  await writeFile(path.join(ROOT, "knowledge", "sources", "sources.json"), `${JSON.stringify(value.sources, null, 2)}\n`);
  const moduleText = [
    'import type { CanonicalKnowledge } from "../../app/lib/assistant/canonical-types.ts";',
    "",
    `export const KNOWLEDGE: CanonicalKnowledge = ${JSON.stringify(value, null, 2)};`,
    "",
  ].join("\n");
  await writeFile(path.join(ROOT, "knowledge", "exports", "knowledge.generated.ts"), moduleText);
}

function chunk(id: string, kind: RetrievalChunk["kind"], entityIds: string[], title: string, text: string, sourceIds: string[], priority: number): RetrievalChunk {
  return { id, kind, entityIds, title, text, tokens: tokenize(`${title} ${text}`), sourceIds, confidence: "high", priority };
}

function formatIngredientAmount(item: CanonicalIngredientAmount): string {
  if (item.amountStatus === "proprietary_unknown") return `${item.name}: inside ${item.blendName}; individual amount not disclosed`;
  if (item.amount === null) return `${item.name}: amount not disclosed`;
  return `${item.name}: ${formatNumber(item.amount)} ${item.unit} per ${item.servingBasis}`;
}

function buildFormulaDifferences(first: CanonicalProduct, second: CanonicalProduct): string[] {
  const firstOnly = first.fullServing.filter((item) => !second.fullServing.some((other) => other.ingredientId === item.ingredientId)).slice(0, 8);
  const secondOnly = second.fullServing.filter((item) => !first.fullServing.some((other) => other.ingredientId === item.ingredientId)).slice(0, 8);
  const sharedDifferences = first.fullServing.flatMap((item) => {
    const other = second.fullServing.find((candidate) => candidate.ingredientId === item.ingredientId);
    if (!other || item.amount === null || other.amount === null || item.unit !== other.unit || item.amount === other.amount) return [];
    return [`${item.name}: ${first.shortName} ${formatNumber(item.amount)} ${item.unit}; ${second.shortName} ${formatNumber(other.amount)} ${other.unit}.`];
  }).slice(0, 8);
  return [
    ...sharedDifferences,
    ...(firstOnly.length ? [`Only ${first.shortName} discloses: ${firstOnly.map(formatIngredientAmount).join("; ")}.`] : []),
    ...(secondOnly.length ? [`Only ${second.shortName} discloses: ${secondOnly.map(formatIngredientAmount).join("; ")}.`] : []),
    `${first.shortName} caffeine: ${caffeineSentence(first)} ${second.shortName} caffeine: ${caffeineSentence(second)}`,
  ];
}

function proprietaryTradeoffs(first: CanonicalProduct, second: CanonicalProduct): string[] {
  if (first.formulaTransparency === second.formulaTransparency) return [];
  return [`Transparency: ${first.shortName} is ${first.formulaTransparency.replaceAll("-", " ")}; ${second.shortName} is ${second.formulaTransparency.replaceAll("-", " ")}.`];
}

function caffeineSentence(product: CanonicalProduct): string {
  if (product.stimulantFree) return `${product.shortName} is stimulant-free and lists no caffeine.`;
  if (product.totalCaffeineMg === null) return `${product.shortName} lists stimulant ingredients, but the verified source set does not confirm a total caffeine amount.`;
  return `${product.shortName} officially lists ${product.totalCaffeineMg} mg total caffeine per ${product.servingSize ?? "full serving"}.`;
}

function proprietaryAnswer(product: CanonicalProduct): string {
  if (!product.proprietaryBlends.length) return `${product.shortName} has a ${product.formulaTransparency.replaceAll("-", " ")} active formula in the canonical record.`;
  return `${product.shortName} uses ${product.proprietaryBlends.map((blend) => `${blend.name} (${formatNumber(blend.totalAmount)} ${blend.unit})`).join(" and ")}. Ingredients are listed in label order, but individual amounts marked proprietary_unknown are not estimated.`;
}

function ingredientFaq(product: CanonicalProduct, query: string): string {
  const matches = product.fullServing.filter((ingredient) => ingredient.normalizedName.includes(normalize(query)));
  if (!matches.length) return `No ${query} ingredient is listed in the current verified ${product.shortName} formula.`;
  return matches.map(formatIngredientAmount).join("; ");
}

function ingredientRoleFaq(product: CanonicalProduct, role: string): string {
  const matches = product.fullServing.filter((ingredient) => ingredient.roles.includes(role as never));
  return matches.length ? `Yes: ${matches.map(formatIngredientAmount).join("; ")}.` : `No ${role}-classified ingredient is stored in the current verified formula.`;
}

function stockAnswer(product: CanonicalProduct): string {
  const available = product.flavors.filter((variant) => variant.stockStatus === "available" && variant.visibility === "visible");
  return available.length ? `${available.length} wholesale variant${available.length === 1 ? " is" : "s are"} currently orderable: ${available.map((variant) => variant.flavor).join(", ")}.` : "No wholesale variants are currently orderable.";
}

function priceAnswer(product: CanonicalProduct, type: "map" | "wholesale"): string {
  const values = unique(product.flavors.filter((variant) => variant.visibility === "visible").map((variant) => type === "map" ? variant.mapPrice : variant.wholesalePrice).filter((value) => value > 0));
  return values.length ? `${product.shortName} ${type === "map" ? "MAP" : "wholesale"}: ${values.map(money).join("–")}. Account-specific wholesale overrides may apply after sign-in.` : "No current portal price is available.";
}

function marginAnswer(product: CanonicalProduct): string {
  const variant = product.flavors.find((item) => item.stockStatus === "available" && item.mapPrice > 0);
  if (!variant) return "No currently available priced variant is stored.";
  const margin = ((variant.mapPrice - variant.wholesalePrice) / variant.mapPrice) * 100;
  return `${variant.flavor}: ${money(variant.wholesalePrice)} wholesale, ${money(variant.mapPrice)} MAP, ${margin.toFixed(2)}% estimated gross MAP margin before other costs.`;
}

function experienceSummary(product: CanonicalProduct): string {
  return `${product.primaryGoal} first. ${product.pumpProfile} ${product.focusProfile} ${product.thermogenicProfile} Stimulant intensity: ${product.stimulantIntensity}.`;
}

function directionsFor(base: (typeof PRODUCT_KNOWLEDGE)[number]): string[] {
  if (/2 scoops/i.test(base.formula.servingSize ?? "")) return ["The label provides a one-scoop and two-scoop serving option.", "Do not exceed the current label directions."];
  if (/cap/i.test(base.formula.servingSize ?? "")) return ["Use the half-cap or full-cap serving exactly as directed on the current label."];
  return ["Use the labeled serving only as directed on the current product container."];
}

function stackCompatibility(base: (typeof PRODUCT_KNOWLEDGE)[number]): string[] {
  const result = base.relationships.complements.map((id) => `Commonly paired with ${id}; review overlapping actives first.`);
  if (!base.formula.stimulantFree) result.push("Avoid casually stacking with another stimulant product; compare official caffeine totals and other stimulant ingredients.");
  if (base.formula.ingredients.some((item) => normalize(item.name).includes("beta alanine"))) result.push("Check beta-alanine overlap with other pre-workouts or standalone Beta-Alanine RAW.");
  return result;
}

function inferUpgrades(id: string): string[] {
  const map: Record<string, string[]> = {
    "cuts-thermogenic-pre-workout": ["cuts-diamond-ultra-thermogenic", "scorch-ultra-thermogenic"],
    "bulk-testosterone-pre-workout": ["bulk-apex-strength-pre-workout"],
    "nitricoxide-stim-free-pre-workout": ["pump-hyper-pump-pre-workout"],
    "nootropic-high-focus-pre-workout": ["rule-hyper-focus"],
  };
  return map[id] ?? [];
}

function inferDowngrades(id: string): string[] {
  const map: Record<string, string[]> = {
    "cuts-diamond-ultra-thermogenic": ["cuts-thermogenic-pre-workout"],
    "scorch-ultra-thermogenic": ["cuts-diamond-ultra-thermogenic", "cuts-thermogenic-pre-workout"],
    "bulk-apex-strength-pre-workout": ["bulk-testosterone-pre-workout"],
    "rule-hyper-focus": ["nootropic-high-focus-pre-workout", "bump-laser-focus-nootropic"],
  };
  return map[id] ?? [];
}

function profileText(base: (typeof PRODUCT_KNOWLEDGE)[number], role: string): string {
  const matches = base.formula.ingredients.filter((ingredient) => ingredient.roles.includes(role as never));
  if (!matches.length) return `The verified formula does not have a dedicated ${role} profile.`;
  return `${role[0].toUpperCase()}${role.slice(1)} profile: ${matches.map((ingredient) => ingredient.amount === undefined ? `${ingredient.name} (amount not disclosed)` : `${ingredient.name} ${formatNumber(ingredient.amount)} ${ingredient.unit}`).join(", ")}.`;
}

function strongestIngredients(product: CanonicalProduct, count: number): string[] {
  return [...product.fullServing].sort((a, b) => toMilligrams(b) - toMilligrams(a)).slice(0, count).map(formatIngredientAmount);
}

function staffExplanation(name: string, purpose: string, differentiators: string[]): string {
  return `${name}: ${purpose} The easiest concrete points are ${differentiators.slice(0, 3).join(", ")}.`;
}

function inferProductType(id: string): CanonicalProduct["productType"] {
  if (/pills|capsules/.test(id)) return "capsule";
  if (/liquid-glycerol/.test(id)) return "liquid";
  if (/-raw$/.test(id)) return "single-ingredient";
  return "powder";
}

function intensity(caffeine: number | undefined, stimulantFree: boolean): CanonicalProduct["stimulantIntensity"] {
  if (stimulantFree) return "none";
  if (caffeine === undefined) return "not-confirmed";
  if (caffeine <= 160) return "low";
  if (caffeine <= 250) return "moderate";
  if (caffeine <= 350) return "high";
  return "very-high";
}

function categoryFromGoals(goals: string[]): string {
  if (goals.includes("cutting")) return "Thermogenic Products";
  if (goals.includes("strength")) return "Strength Products";
  if (goals.includes("focus")) return "High Stimulant & Focus";
  if (goals.includes("pump")) return "Stim-Free & Pump";
  return "Products";
}

function goalName(goal: string): string {
  const labels: Record<string, string> = { cutting: "Thermogenic and cutting", energy: "Energy", focus: "Focus", pump: "Pump", strength: "Strength and power", recovery: "Recovery", daily: "Daily-use positioning", "stim-free": "Stimulant-free", performance: "Training performance", hydration: "Hydration" };
  return labels[goal] ?? goal;
}

function pairKey(first: string, second: string): string {
  return [first, second].sort().join("|");
}

function names(ids: string[]): string[] {
  return ids.map((id) => productById.get(id)?.shortName ?? id);
}

function reachesRange(amount: CanonicalIngredientAmount, range: typeof ingredientGuidance[string]["range"]): boolean | null {
  if (!range || amount.amount === null || amount.unit !== range[2]) return null;
  return amount.amount >= range[0] && amount.amount <= range[1];
}

function hasIngredient(product: CanonicalProduct, query: string): boolean {
  return product.fullServing.some((ingredient) => ingredient.normalizedName.includes(normalize(query)));
}

function ingredientRoleCount(product: CanonicalProduct, role: string): number {
  return product.fullServing.filter((ingredient) => ingredient.roles.includes(role as never)).length;
}

function ingredientRoleAmount(product: CanonicalProduct, role: string): number {
  return product.fullServing.filter((ingredient) => ingredient.roles.includes(role as never)).reduce((total, ingredient) => total + toMilligrams(ingredient), 0);
}

function toMilligrams(ingredient: CanonicalIngredientAmount): number {
  if (ingredient.amount === null) return 0;
  if (ingredient.unit === "g") return ingredient.amount * 1000;
  if (ingredient.unit === "mcg") return ingredient.amount / 1000;
  return ingredient.amount;
}

function tokenize(value: string): string[] {
  return unique(normalize(value).split(" ").filter((token) => token.length > 1));
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function slug(value: string): string {
  return normalize(value).replaceAll(" ", "-");
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value).replace(/0+$/, "").replace(/\.$/, "");
}

function money(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
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

function intersection(first: string[], second: string[]): string[] {
  const other = new Set(second);
  return unique(first.filter((item) => other.has(item)));
}

const sources = buildSources();
const products = PRODUCT_KNOWLEDGE.map(buildProduct);
productById = new Map(products.map((product) => [product.id, product]));
const ingredients = buildIngredients(products, sources);
const comparisons = buildComparisons(products);
const faq = products.flatMap((product) => buildFaqs(product));
const stacks = buildStacks(products);
const sales = buildSales(products);
const relationships = Object.fromEntries(products.map((product) => [
  product.id,
  unique([...product.relatedProducts, ...product.alternatives, ...product.upgrades, ...product.downgrades]),
]));
const aliases = Object.fromEntries(products.map((product) => [product.id, unique([
  product.shortName,
  product.officialName,
  ...product.aliases,
  ...product.commonMisspellings,
])]));
const retrievalChunks = buildRetrievalChunks(products, ingredients, comparisons, faq, stacks, sales);
const benchmarks = buildBenchmarks(products, comparisons);
const knowledge: CanonicalKnowledge = {
  schemaVersion: 1,
  generatedAt: GENERATED_AT,
  products,
  ingredients,
  comparisons,
  faq,
  stacks,
  sales,
  relationships,
  aliases,
  sources,
  retrievalChunks,
  benchmarks,
};

await writeKnowledge(knowledge);
console.log(`Built BLACKMARKET knowledge: ${products.length} products, ${ingredients.length} ingredients, ${comparisons.length} comparisons, ${faq.length} FAQs, ${retrievalChunks.length} retrieval chunks, ${benchmarks.length} benchmarks.`);
