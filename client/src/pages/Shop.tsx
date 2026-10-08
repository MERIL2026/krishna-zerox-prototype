import { useMemo, useState } from "react";
import { ArrowRight, Search, SlidersHorizontal, Star } from "lucide-react";
import { Link } from "wouter";
import { products, type Product } from "@/data/store";
import { AddToCartButton, FilterPill, SaveButton, SectionRule, showAddedToast } from "@/components/StorefrontShell";
import { trpc } from "@/lib/trpc";

export default function Shop({ onAdd }: { onAdd: (product: Product) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [sort, setSort] = useState("Featured");
  const catalogQuery = trpc.catalog.list.useQuery(undefined, { staleTime: 60_000 });
  const catalogProducts = catalogQuery.data?.length ? catalogQuery.data : products;
  const categories = ["All", ...Array.from(new Set(catalogProducts.map((product) => product.category)))];
  const filtered = useMemo(() => {
    let next = catalogProducts.filter((product) => (category === "All" || product.category === category) && `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase()));
    if (sort === "Price low") next = [...next].sort((a, b) => a.price - b.price);
    if (sort === "Price high") next = [...next].sort((a, b) => b.price - a.price);
    return next;
  }, [catalogProducts, category, query, sort]);

  return <div className="shop-page"><div className="shell shop-head"><div><span className="eyebrow">THE WHOLE SHELF</span><h1>Shop the good stuff.</h1><p>Useful, beautiful, and ready to make a regular day feel a little more considered.</p></div><Link href="/" className="text-link">Back home <ArrowRight size={16} /></Link></div><div className="shell shop-toolbar"><label className="shop-search"><Search size={17} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notebooks, gifts, pens..." aria-label="Search products" /></label><div className="shop-filters"><FilterPill label={sort} active onClick={() => setSort(sort === "Featured" ? "Price low" : sort === "Price low" ? "Price high" : "Featured")} /><button className="filter-pill"><SlidersHorizontal size={14} /> Filters</button></div></div><div className="shell shop-categories">{categories.map((item) => <button key={item} className={category === item ? "active" : ""} onClick={() => setCategory(item)}>{item}</button>)}</div><div className="shell shop-rule"><SectionRule>{filtered.length} good things</SectionRule></div><div className="shell shop-grid">{filtered.map((product) => <article className="product-card shop-product-card" key={product.id}><div className="product-image" style={{ backgroundColor: product.swatch }}><img src={product.image} alt={product.name} loading="lazy" decoding="async" /><SaveButton />{product.badge && <span className="product-badge">{product.badge}</span>}</div><div className="product-meta"><span className="product-category">{product.category}</span><h3>{product.name}</h3><p>{product.description}</p><div className="product-bottom"><div><strong>₹{product.price}</strong><span className="rating"><Star size={12} fill="currentColor" /> {product.rating}</span></div><AddToCartButton onClick={() => { onAdd(product); showAddedToast(product.name); }} /></div></div></article>)}</div></div>;
}
