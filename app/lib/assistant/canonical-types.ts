import type { AssistantIntent, IngredientRole, KnowledgeVerification } from "./types.ts";

export type FactConfidence = "high" | "medium" | "low";
export type AmountStatus = "exact" | "proprietary_unknown" | "blend_total" | "not_disclosed";

export interface CanonicalSource {
  id: string;
  title: string;
  type: "supplement-facts-label" | "official-product-page" | "official-catalog" | "portal-catalog" | "owner-confirmation" | "research-paper";
  location: string;
  accessedAt: string;
  priority: number;
  confidence: FactConfidence;
  notes?: string[];
}

export interface CanonicalIngredientAmount {
  ingredientId: string;
  name: string;
  normalizedName: string;
  amount: number | null;
  unit: "mcg" | "mg" | "g" | null;
  amountStatus: AmountStatus;
  servingBasis: string;
  blendName: string | null;
  blendTotal: number | null;
  blendTotalUnit: "mg" | "g" | null;
  labelOrder: number | null;
  roles: IngredientRole[];
  sourceIds: string[];
  confidence: FactConfidence;
}

export interface CanonicalProduct {
  id: string;
  brandId: "blackmarketlabs";
  officialName: string;
  shortName: string;
  slug: string;
  aliases: string[];
  commonMisspellings: string[];
  category: string;
  subcategory: string;
  productType: "powder" | "capsule" | "liquid" | "single-ingredient";
  format: string;
  status: "active" | "catalog-only" | "discontinued";
  featured: boolean;
  hidden: boolean;
  comingSoon: boolean;
  limited: boolean;
  runningLow: boolean;
  primaryGoal: string;
  secondaryGoals: string[];
  shortDescription: string;
  wholesaleSummary: string;
  retailerSalesPitch: string;
  keyDifferentiators: string[];
  bestFor: string[];
  notIdealFor: string[];
  targetCustomer: string;
  suggestedStaffExplanation: string;
  suggestedRetailerTalkingPoints: string[];
  servingSize: string | null;
  servingsPerContainer: number | null;
  calories: number | null;
  fullServing: CanonicalIngredientAmount[];
  partialServings: Array<{ label: string; multiplier: number; ingredients: CanonicalIngredientAmount[] }>;
  proprietaryBlends: Array<{
    name: string;
    totalAmount: number;
    unit: "mg" | "g";
    ingredients: string[];
    sourceIds: string[];
  }>;
  otherIngredients: string[];
  totalCaffeineMg: number | null;
  totalCaffeineStatus: "official-total" | "caffeine-anhydrous-only" | "none" | "not-confirmed";
  caffeineSources: string[];
  stimulantFree: boolean;
  stimulantIntensity: "none" | "low" | "moderate" | "high" | "very-high" | "not-confirmed";
  pumpProfile: string;
  focusProfile: string;
  thermogenicProfile: string;
  strengthProfile: string;
  enduranceProfile: string;
  formulaTransparency: "fully-transparent" | "partially-transparent" | "proprietary";
  beginnerSuitability: string;
  advancedUserSuitability: string;
  dailyUseSuitability: string;
  lateNightSuitability: string;
  naturalOrArtificialFlavors: string;
  colorsAndSweeteners: string;
  directions: string[];
  warnings: string[];
  stackingCompatibility: string[];
  overlappingIngredients: string[];
  relatedProducts: string[];
  alternatives: string[];
  upgrades: string[];
  downgrades: string[];
  searchTags: string[];
  flavors: Array<{
    variantId: string;
    flavor: string;
    sku: string;
    stockStatus: "available" | "coming-soon" | "sold-out";
    visibility: "visible" | "hidden";
    limited: boolean;
    runningLow: boolean;
    wholesalePrice: number;
    mapPrice: number;
  }>;
  verificationStatus: KnowledgeVerification;
  sourceReferences: string[];
  conflicts: string[];
  lastVerifiedAt: string;
}

export interface CanonicalIngredient {
  id: string;
  name: string;
  normalizedName: string;
  aliases: string[];
  roles: IngredientRole[];
  whatItIs: string;
  howItWorks: string;
  whyIncluded: string;
  evidenceSupportedRanges: Array<{
    minimum: number;
    maximum: number;
    unit: "mg" | "g";
    context: string;
    sourceIds: string[];
  }>;
  evidenceLimitations: string[];
  possibleSideEffects: string[];
  relatedIngredients: string[];
  synergisticIngredients: string[];
  overlappingIngredients: string[];
  productsContaining: Array<{
    productId: string;
    amount: number | null;
    unit: "mcg" | "mg" | "g" | null;
    amountStatus: AmountStatus;
    reachesReferencedRange: boolean | null;
  }>;
  sourceReferences: string[];
}

export interface CanonicalComparison {
  id: string;
  productIds: [string, string];
  title: string;
  directVerdict: string;
  majorFormulaDifferences: string[];
  experience: string;
  chooseFirstWhen: string[];
  chooseSecondWhen: string[];
  tradeoffs: string[];
  overlappingIngredients: string[];
  bottomLine: string;
  sourceReferences: string[];
}

export interface CanonicalFaq {
  id: string;
  productId: string;
  question: string;
  answer: string;
  tags: string[];
  sourceReferences: string[];
}

export interface CanonicalStack {
  id: string;
  productIds: string[];
  name: string;
  positioning: string;
  overlaps: string[];
  cautions: string[];
  retailerExplanation: string;
  sourceReferences: string[];
}

export interface SalesRecommendation {
  id: string;
  queryTags: string[];
  verdict: string;
  rankedProductIds: string[];
  reasons: Record<string, string[]>;
  exclusions: string[];
}

export interface RetrievalChunk {
  id: string;
  kind: "product" | "formula" | "ingredient" | "comparison" | "faq" | "stack" | "sales";
  entityIds: string[];
  title: string;
  text: string;
  tokens: string[];
  sourceIds: string[];
  confidence: FactConfidence;
  priority: number;
}

export interface AssistantBenchmark {
  id: string;
  question: string;
  expectedIntent: AssistantIntent;
  expectedProductIds: string[];
  requiredFacts: string[];
  forbiddenClaims: string[];
  responseType: string;
  followUpTo?: string;
}

export interface CanonicalKnowledge {
  schemaVersion: 1;
  generatedAt: string;
  products: CanonicalProduct[];
  ingredients: CanonicalIngredient[];
  comparisons: CanonicalComparison[];
  faq: CanonicalFaq[];
  stacks: CanonicalStack[];
  sales: SalesRecommendation[];
  relationships: Record<string, string[]>;
  aliases: Record<string, string[]>;
  sources: CanonicalSource[];
  retrievalChunks: RetrievalChunk[];
  benchmarks: AssistantBenchmark[];
}
