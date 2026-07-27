export type KnowledgeVerification = "unverified" | "needs-review" | "verified" | "archived";

export type IngredientRole =
  | "energy"
  | "stimulant"
  | "pump"
  | "focus"
  | "hydration"
  | "performance"
  | "strength"
  | "recovery"
  | "thermogenic"
  | "vitamin"
  | "mineral"
  | "other";

export interface AssistantIngredient {
  name: string;
  normalizedName: string;
  amount?: number;
  unit?: "mcg" | "mg" | "g";
  servingBasis?: string;
  disclosure: "exact" | "blend-total" | "listed-in-blend" | "official-highlight";
  roles: IngredientRole[];
  verified: boolean;
  sourceIds: string[];
}

export interface AssistantSource {
  id: string;
  type: "catalog-record" | "supplement-facts-image" | "official-product-page" | "product-guide" | "admin-entry";
  location: string;
  note?: string;
}

export interface ProductKnowledgeBlueprint {
  productId: string;
  shortName: string;
  aliases: string[];
  commonMisspellings?: string[];
  purpose: string;
  retailerPitch: string;
  bestFor: string[];
  notIdealFor: string[];
  keyDifferentiators: string[];
  goals: Array<"cutting" | "energy" | "focus" | "pump" | "strength" | "recovery" | "daily" | "stim-free" | "performance" | "hydration">;
  formula: {
    servingSize?: string;
    servingsPerContainer?: number;
    totalCaffeineMg?: number;
    caffeineServingBasis?: string;
    stimulantFree: boolean;
    ingredients: AssistantIngredient[];
    warnings?: string[];
    verification: KnowledgeVerification;
    reviewNotes?: string[];
  };
  relationships: {
    commonlyComparedWith: string[];
    complements: string[];
    substitutes: string[];
  };
  approvedFaqs?: Array<{ question: string; answer: string }>;
  prohibitedClaims: string[];
  sources: AssistantSource[];
  verification: KnowledgeVerification;
}

export interface ProductKnowledgeOverride {
  productId: string;
  shortName?: string;
  aliases?: string[];
  commonMisspellings?: string[];
  purpose?: string;
  retailerPitch?: string;
  bestFor?: string[];
  notIdealFor?: string[];
  keyDifferentiators?: string[];
  goals?: ProductKnowledgeBlueprint["goals"];
  formula?: ProductKnowledgeBlueprint["formula"];
  relationships?: ProductKnowledgeBlueprint["relationships"];
  approvedFaqs?: Array<{ question: string; answer: string }>;
  prohibitedClaims?: string[];
  verification?: KnowledgeVerification;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AssistantVariant {
  id: string;
  productId: string;
  flavor: string;
  item: string;
  upc: string;
  image: string;
  wholesalePrice: number;
  standardWholesalePrice: number;
  mapPrice: number;
  marginPercent: number;
  status: "available" | "coming-soon" | "sold-out";
  limited: boolean;
  runningLow: boolean;
  hidden: boolean;
}

export interface AssistantProduct {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  category: string;
  categorySlug: string;
  image: string;
  aliases: string[];
  commonMisspellings: string[];
  purpose: string;
  retailerPitch: string;
  bestFor: string[];
  notIdealFor: string[];
  keyDifferentiators: string[];
  goals: ProductKnowledgeBlueprint["goals"];
  formula: ProductKnowledgeBlueprint["formula"];
  relationships: ProductKnowledgeBlueprint["relationships"];
  approvedFaqs: Array<{ question: string; answer: string }>;
  prohibitedClaims: string[];
  sources: AssistantSource[];
  verification: KnowledgeVerification;
  variants: AssistantVariant[];
}

export type AssistantIntent =
  | "greeting"
  | "gratitude"
  | "capabilities"
  | "general_product_education"
  | "compare_products"
  | "explain_product"
  | "find_by_goal"
  | "find_by_ingredient"
  | "exclude_ingredient"
  | "rank_by_caffeine"
  | "find_stimulant_free"
  | "calculate_margin"
  | "show_pricing"
  | "show_flavors"
  | "show_stock"
  | "show_new_products"
  | "suggest_opening_order"
  | "suggest_product_pairing"
  | "add_to_cart"
  | "remove_from_cart"
  | "replace_cart_item"
  | "update_quantity"
  | "summarize_cart"
  | "identify_missing_categories"
  | "staff_training"
  | "unsupported_question";

export interface AssistantContext {
  productIds: string[];
  variantIds: string[];
  lastIntent?: AssistantIntent;
}

export interface AssistantCartAction {
  type: "add" | "remove" | "set" | "replace";
  label: string;
  updates: Array<{ variantId: string; quantity: number; mode: "add" | "set" | "remove" }>;
}

export interface AssistantComparisonRow {
  label: string;
  values: string[];
}

export interface AssistantResponseSection {
  heading: string;
  paragraphs: string[];
  expandable?: boolean;
}

export interface AssistantResponse {
  id: string;
  intent: AssistantIntent;
  directAnswer: string;
  details: string[];
  sections?: AssistantResponseSection[];
  productIds: string[];
  comparison?: {
    productIds: string[];
    rows: AssistantComparisonRow[];
  };
  pendingAction?: AssistantCartAction;
  clarification?: {
    prompt: string;
    options: string[];
  };
  nextContext: AssistantContext;
  responseType: "answer" | "comparison" | "recommendation" | "cart-action" | "clarification" | "unsupported";
}

export interface AssistantQuestionFixture {
  question: string;
  expectedIntent: AssistantIntent;
  expectedProductIds: string[];
  requiredFacts: string[];
  unacceptableClaims: string[];
  expectedResponseType: AssistantResponse["responseType"];
}
