import { useMemo, useState } from "react";
import { ArrowRight, Search, SlidersHorizontal, Star, X } from "lucide-react";
import { Link } from "wouter";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { products, type Product } from "@/data/store";
import {
  AddToCartButton,
  FilterPill,
  SaveButton,
  SectionRule,
  showAddedToast,
} from "@/components/StorefrontShell";
import { trpc } from "@/lib/trpc";

export default function Shop({ onAdd }: { onAdd: (product: Product) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Featured");
  const shouldReduceMotion = useReducedMotion();

  const catalogQuery = trpc.catalog.list.useQuery(undefined, { staleTime: 60_000 });
  const categoriesQuery = trpc.catalog.categories.useQuery(undefined, { staleTime: 60_000 });
  const catalogProducts = catalogQuery.data?.length ? catalogQuery.data : products;

  const categories = useMemo(() => {
    const fromDb = categoriesQuery.data?.length
      ? categoriesQuery.data.map((c) => c.name)
      : Array.from(new Set(catalogProducts.map((p) => p.category)));
    return ["All", ...fromDb];
  }, [categoriesQuery.data, catalogProducts]);

  const filtered = useMemo(() => {
    let next = catalogProducts.filter((product) => {
      const matchesCategory = category === "All" || product.category === category;
      const matchesQuery = `${product.name} ${product.category} ${product.description}`
        .toLowerCase()
        .includes(query.toLowerCase().trim());
      return matchesCategory && matchesQuery;
    });

    if (sort === "Price low") next = [...next].sort((a, b) => a.price - b.price);
    if (sort === "Price high") next = [...next].sort((a, b) => b.price - a.price);
    if (sort === "Rating") next = [...next].sort((a, b) => b.rating - a.rating);

    return next;
  }, [catalogProducts, category, query, sort]);

  return (
    <div className="shop-page">
      <div className="shell shop-head">
        <div>
          <div className="section-eyebrow-row">
            <span className="section-number">01</span>
            <span className="eyebrow">THE COMPLETE COLLECTION</span>
          </div>
          <h1>Shop the good stuff.</h1>
          <p>
            Useful, beautiful, and ready to make a regular workday feel a little
            more considered. Curated in-store at Krishna Xerox.
          </p>
        </div>
        <Link href="/" className="text-link">
          Back home <ArrowRight size={16} />
        </Link>
      </div>

      <div className="shell shop-toolbar">
        <label className="shop-search">
          <Search size={18} className="text-muted flex-shrink-0" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notebooks, gifts, pens, stationery..."
            aria-label="Search products"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label="Clear search query"
              className="p-1 hover:text-ink text-muted transition-colors"
            >
              <X size={15} />
            </button>
          )}
        </label>

        <div className="shop-filters">
          <FilterPill
            label={`Sort: ${sort}`}
            active
            onClick={() => {
              setSort((current) => {
                if (current === "Featured") return "Price low";
                if (current === "Price low") return "Price high";
                if (current === "Price high") return "Rating";
                return "Featured";
              });
            }}
          />
          <button
            className="filter-pill"
            onClick={() => {
              setCategory("All");
              setQuery("");
              setSort("Featured");
            }}
            title="Reset filters"
          >
            <SlidersHorizontal size={14} /> Reset
          </button>
        </div>
      </div>

      <div className="shell shop-categories">
        {categories.map((item) => (
          <button
            key={item}
            className={category === item ? "active" : ""}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>

      <div className="shell shop-rule">
        <SectionRule>
          {filtered.length} {filtered.length === 1 ? "good thing" : "good things"} found
        </SectionRule>
      </div>

      <div className="shell">
        {filtered.length === 0 ? (
          <div className="empty-cart" style={{ padding: "80px 20px" }}>
            <div className="empty-cart-art">✦</div>
            <h3>No stationery matching your search</h3>
            <p>Try searching for pens, journals, gifts, or reset your filters.</p>
            <button
              className="button button-dark"
              onClick={() => {
                setQuery("");
                setCategory("All");
              }}
            >
              Clear filters <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <div className="shop-grid">
            <AnimatePresence mode="popLayout">
              {filtered.map((product) => (
                <motion.article
                  className="product-card shop-product-card"
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.96 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="product-image" style={{ backgroundColor: product.swatch }}>
                    <img
                      src={product.image}
                      alt={product.name}
                      loading="lazy"
                      decoding="async"
                    />
                    <SaveButton />
                    {product.badge && <span className="product-badge">{product.badge}</span>}
                  </div>
                  <div className="product-meta">
                    <span className="product-category">{product.category}</span>
                    <h3>{product.name}</h3>
                    <p>{product.description}</p>
                    <div className="product-bottom">
                      <div>
                        <strong>₹{product.price}</strong>
                        {product.oldPrice && <del>₹{product.oldPrice}</del>}
                        <span className="rating">
                          <Star size={12} fill="currentColor" /> {product.rating}
                        </span>
                      </div>
                      <AddToCartButton
                        onClick={() => {
                          onAdd(product);
                          showAddedToast(product.name);
                        }}
                      />
                    </div>
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
