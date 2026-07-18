"use client";

import { useMemo, useState } from "react";

import { ProductCard } from "@/components/catalog/product-card";
import { QuickOrder } from "@/components/catalog/quick-order";
import { searchCatalogItems } from "@/lib/catalog/search";
import { trackPortalEvent } from "@/lib/analytics/client";
import type { CatalogContract } from "@/types";

const SECTION_LABELS: Record<string, string> = {
  all: "All products", thermogenics: "Thermogenics", focus: "High Stim & Nootropics", pump: "Pump", strength: "Strength", raws: "Raws",
};

export function CatalogExplorer({ contract, initialCategory = "all" }: { contract: CatalogContract; initialCategory?: string }) {
  const [category, setCategory] = useState(initialCategory);
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(18);
  const visible = useMemo(() => {
    const searched = searchCatalogItems(contract.items, query);
    return query.trim() ? searched : searched.filter((item) => category === "all" || item.section === category);
  }, [category, contract.items, query]);
  const sections = ["all", ...new Set(contract.items.map((item) => item.section))];
  return (
    <>
      <QuickOrder items={contract.items} />
      <section className="catalog-explorer" aria-labelledby="catalog-heading">
        <div className="catalog-controls">
          <label className="catalog-search"><span className="sr-only">Search all products</span><input type="search" value={query} onChange={(event) => { setQuery(event.target.value); setLimit(18); }} onBlur={() => { if (query.trim()) trackPortalEvent("search_used", { queryLength: query.trim().length, resultCount: visible.length }); }} placeholder="Search SKU, UPC, product, or flavor" /></label>
          <nav className="catalog-filters" aria-label="Product categories">
            {sections.map((section) => <button key={section} type="button" aria-pressed={category === section} onClick={() => { setCategory(section); setQuery(""); setLimit(18); trackPortalEvent("category_viewed", { category: section }); }}>{SECTION_LABELS[section] || section}</button>)}
          </nav>
        </div>
        <header className="catalog-heading"><div><p className="portal-kicker">{query ? "Search results" : `${visible.length} SKUs`}</p><h1 id="catalog-heading">{query ? `Results for “${query}”` : SECTION_LABELS[category] || category}</h1></div><span>{visible.length} item{visible.length === 1 ? "" : "s"}</span></header>
        {visible.length ? <><div className="product-grid">{visible.slice(0, limit).map((item, index) => <ProductCard key={item.variantId} item={item} priority={index < 2} />)}</div>{visible.length > limit ? <button className="catalog-load-more" type="button" onClick={() => setLimit((current) => current + 18)}>Show more products <span>{Math.min(visible.length - limit, 18)} of {visible.length - limit} remaining</span></button> : null}</> : <div className="portal-empty">No orderable products match that search.</div>}
      </section>
    </>
  );
}
