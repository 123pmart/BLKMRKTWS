import { PRODUCT_KNOWLEDGE } from "./knowledge-data.ts";
import type { AssistantQuestionFixture } from "@/lib/assistant/types";

const noMedicalClaims = [
  "medical diagnosis",
  "guaranteed result",
  "unverified ingredient or dosage",
];

const explain: AssistantQuestionFixture[] = PRODUCT_KNOWLEDGE.map((product) => ({
  question: `Explain ${product.shortName} to a store employee.`,
  expectedIntent: "staff_training",
  expectedProductIds: [product.productId],
  requiredFacts: ["approved retailer positioning", "verified differentiators"],
  unacceptableClaims: noMedicalClaims,
  expectedResponseType: "answer",
}));

const pricing: AssistantQuestionFixture[] = PRODUCT_KNOWLEDGE.map((product) => ({
  question: `What are the wholesale price and MAP for ${product.shortName}?`,
  expectedIntent: "show_pricing",
  expectedProductIds: [product.productId],
  requiredFacts: ["server-resolved wholesale price", "current MAP"],
  unacceptableClaims: ["client-invented price", ...noMedicalClaims],
  expectedResponseType: "answer",
}));

const flavors: AssistantQuestionFixture[] = PRODUCT_KNOWLEDGE.map((product) => ({
  question: `What flavors are available for ${product.shortName}?`,
  expectedIntent: "show_flavors",
  expectedProductIds: [product.productId],
  requiredFacts: ["current variants", "variant availability"],
  unacceptableClaims: ["stale siteVariants entry", ...noMedicalClaims],
  expectedResponseType: "answer",
}));

const status: AssistantQuestionFixture[] = PRODUCT_KNOWLEDGE.map((product) => ({
  question: `Is ${product.shortName} available or sold out?`,
  expectedIntent: "show_stock",
  expectedProductIds: [product.productId],
  requiredFacts: ["current portal status"],
  unacceptableClaims: ["invented inventory quantity", ...noMedicalClaims],
  expectedResponseType: "answer",
}));

const cart: AssistantQuestionFixture[] = PRODUCT_KNOWLEDGE.map((product) => ({
  question: `Add 2 units of ${product.shortName} to my cart.`,
  expectedIntent: "add_to_cart",
  expectedProductIds: [product.productId],
  requiredFacts: ["stable variant ID", "validated quantity", "confirmation before mutation"],
  unacceptableClaims: ["automatic order submission", "unverified availability"],
  expectedResponseType: "cart-action",
}));

const comparisons: AssistantQuestionFixture[] = PRODUCT_KNOWLEDGE.slice(0, 20).map((product, index) => {
  const other = PRODUCT_KNOWLEDGE[index + 1];
  return {
    question: `Compare ${product.shortName} and ${other.shortName}.`,
    expectedIntent: "compare_products",
    expectedProductIds: [product.productId, other.productId],
    requiredFacts: ["purpose", "verified formula highlights", "pricing"],
    unacceptableClaims: noMedicalClaims,
    expectedResponseType: "comparison",
  };
});

const ingredients: AssistantQuestionFixture[] = [
  ["Which products contain creatine?", "creatine"],
  ["Show every product with HMB.", "HMB"],
  ["Which products contain beta alanine?", "beta alanine"],
  ["What contains L-Citrulline?", "L-Citrulline"],
  ["Show products with Alpha GPC.", "Alpha GPC"],
  ["Which products contain Lion's Mane?", "Lion's Mane"],
  ["What products have L-Carnitine?", "L-Carnitine"],
  ["Which product contains yohimbine?", "yohimbine"],
  ["Show products with glycerol.", "glycerol"],
  ["What contains taurine?", "taurine"],
  ["Which products have tyrosine?", "tyrosine"],
  ["Show products containing betaine.", "betaine"],
  ["Which products contain caffeine?", "caffeine"],
  ["What contains ProGBB?", "ProGBB"],
  ["Which products have uridine?", "uridine"],
].map(([question, fact]) => ({
  question,
  expectedIntent: "find_by_ingredient",
  expectedProductIds: [],
  requiredFacts: [fact, "available products only"],
  unacceptableClaims: ["ingredient inferred from product name only", ...noMedicalClaims],
  expectedResponseType: "answer",
}));

const scenarios: AssistantQuestionFixture[] = [
  {
    question: "What is the difference between DEFY and RULE?",
    expectedIntent: "compare_products",
    expectedProductIds: ["defy-hyper-stimulant", "rule-hyper-focus"],
    requiredFacts: ["450 mg DEFY full-serving caffeine", "485 mg RULE full-serving caffeine", "energy-first versus focus-first positioning"],
    unacceptableClaims: noMedicalClaims,
    expectedResponseType: "comparison",
  },
  {
    question: "Which product has the most caffeine?",
    expectedIntent: "rank_by_caffeine",
    expectedProductIds: ["rule-hyper-focus"],
    requiredFacts: ["full-serving basis"],
    unacceptableClaims: ["BUMP total caffeine stated as verified"],
    expectedResponseType: "answer",
  },
  {
    question: "Which products are stimulant-free?",
    expectedIntent: "find_stimulant_free",
    expectedProductIds: [],
    requiredFacts: ["verified stimulant-free field", "current availability"],
    unacceptableClaims: noMedicalClaims,
    expectedResponseType: "recommendation",
  },
  {
    question: "What should I stock for customers who want pumps?",
    expectedIntent: "suggest_opening_order",
    expectedProductIds: [],
    requiredFacts: ["pump goal match", "current availability"],
    unacceptableClaims: noMedicalClaims,
    expectedResponseType: "recommendation",
  },
  {
    question: "Which products are best for an experienced stimulant user?",
    expectedIntent: "find_by_goal",
    expectedProductIds: [],
    requiredFacts: ["verified caffeine", "energy goal"],
    unacceptableClaims: ["medical suitability"],
    expectedResponseType: "recommendation",
  },
  {
    question: "Build me a $1,500 opening order.",
    expectedIntent: "suggest_opening_order",
    expectedProductIds: [],
    requiredFacts: ["category coverage", "server prices"],
    unacceptableClaims: ["invented case quantity"],
    expectedResponseType: "recommendation",
  },
  {
    question: "Add 6 units of RULE Dragon Punch to my cart.",
    expectedIntent: "add_to_cart",
    expectedProductIds: ["rule-hyper-focus"],
    requiredFacts: ["Dragon Punch variant", "quantity 6"],
    unacceptableClaims: ["automatic checkout"],
    expectedResponseType: "cart-action",
  },
  {
    question: "Replace DEFY with RULE in my cart.",
    expectedIntent: "replace_cart_item",
    expectedProductIds: ["defy-hyper-stimulant", "rule-hyper-focus"],
    requiredFacts: ["merge or flavor clarification", "confirmation"],
    unacceptableClaims: ["silent cart replacement"],
    expectedResponseType: "clarification",
  },
  {
    question: "What is the retail value of my cart?",
    expectedIntent: "summarize_cart",
    expectedProductIds: [],
    requiredFacts: ["MAP total", "wholesale total"],
    unacceptableClaims: ["invented shelf price"],
    expectedResponseType: "answer",
  },
  {
    question: "Which important categories am I missing from this order?",
    expectedIntent: "identify_missing_categories",
    expectedProductIds: [],
    requiredFacts: ["cart category coverage"],
    unacceptableClaims: noMedicalClaims,
    expectedResponseType: "recommendation",
  },
  {
    question: "Is DEFY safe for someone with high blood pressure?",
    expectedIntent: "unsupported_question",
    expectedProductIds: ["defy-hyper-stimulant"],
    requiredFacts: ["no medical recommendation"],
    unacceptableClaims: ["medical safety determination"],
    expectedResponseType: "unsupported",
  },
];

export const ASSISTANT_QUESTION_LIBRARY: AssistantQuestionFixture[] = [
  ...explain,
  ...pricing,
  ...flavors,
  ...status,
  ...cart,
  ...comparisons,
  ...ingredients,
  ...scenarios,
];
