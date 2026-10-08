import { useState } from "react";
import { ArrowRight, Check, ChevronRight, Clock3, FileText, MapPin, PackageCheck, Palette, Printer, ScanLine, ShieldCheck, Sparkles, Star, WandSparkles, Zap } from "lucide-react";
import { Link } from "wouter";
import { categories, customProducts, products, type CartLine, type Product } from "@/data/store";
import { AddToCartButton, CategoryArrow, SaveButton, SectionRule, showAddedToast, SparkleNote } from "@/components/StorefrontShell";
import { trpc } from "@/lib/trpc";

export default function Home({ onAdd, onPrint }: { onAdd: (product: Product) => void; onPrint: () => void }) {
  const [activeCategory, setActiveCategory] = useState("All picks");
  const [stamps, setStamps] = useState(5);
  const catalogQuery = trpc.catalog.list.useQuery(undefined, { staleTime: 60_000 });
  const catalogProducts = catalogQuery.data?.length ? catalogQuery.data : products;
  const featured = activeCategory === "All picks" ? catalogProducts.slice(0, 4) : catalogProducts.filter((product) => product.category === activeCategory || (activeCategory === "Aesthetic" && product.category === "Custom"));

  return (
    <div>
      <section className="hero-section">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <SparkleNote color="yellow">A nicer kind of everyday</SparkleNote>
            <h1>Make room<br /><span>for good ideas.</span></h1>
            <p>Stationery, thoughtful gifts and fast printing for the lists, letters, and little projects that make a day yours.</p>
            <div className="hero-actions"><Link href="/shop" className="button button-dark">Shop the good stuff <ArrowRight size={17} /></Link><button className="button button-quiet" onClick={onPrint}><span className="button-icon"><Printer size={16} /></span>Print something</button></div>
            <div className="hero-proof"><span><Check size={13} /> Curated in-store</span><span><Check size={13} /> Pickup when ready</span></div>
          </div>
          <div className="hero-visual">
            <div className="hero-tape tape-pink">NEW IN THE SHOP</div>
            <div className="hero-photo-frame"><img src="/manus-storage/async-images/gRZv044B1QIKDt7lnuycFE/image-1.webp" alt="A curated overhead arrangement of colorful stationery and paper goods" /><div className="hero-photo-tag"><span>01</span><b>Desk<br />joy</b></div></div>
            <div className="hero-sticker sticker-yellow">Paper<br /><em>people</em><span>✦</span></div>
            <div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" />
          </div>
        </div>
        <div className="hero-scribble">✳</div>
      </section>

      <section className="service-strip"><div className="shell service-grid"><div className="service-intro"><span className="eyebrow">THE QUICK BIT</span><strong>Good things,<br />without the wait.</strong></div><div className="service-item"><span className="service-icon"><Zap size={18} /></span><div><b>Fast printing</b><span>Upload, customize, done.</span></div></div><div className="service-item"><span className="service-icon"><PackageCheck size={18} /></span><div><b>Easy pickup</b><span>Order online, collect nearby.</span></div></div><div className="service-item"><span className="service-icon"><WandSparkles size={18} /></span><div><b>Custom made</b><span>Your idea, our good paper.</span></div></div><div className="service-item"><span className="service-icon"><MapPin size={18} /></span><div><b>Local & close</b><span>12 Paper Street, hello.</span></div></div></div></section>

      <section className="categories-section" id="categories"><div className="shell"><SectionRule>Find your kind of thing <span>✦</span></SectionRule><div className="section-heading-row"><div><span className="eyebrow">SHOP BY CATEGORY</span><h2>A little world<br /><em>of useful joy.</em></h2></div><p>From the desk essentials you reach for daily to the lovely little surprises you didn’t know you needed.</p></div><div className="category-grid">{categories.map((category) => <a href={category.label === "Printing" ? "#printing" : category.label === "Custom" ? "#custom" : "/shop"} key={category.label} className={`category-card category-${category.color}`}><div className="category-copy"><span>{category.kicker}</span><h3>{category.label}</h3><small>{category.count}</small></div><div className="category-art" aria-hidden="true">{category.art}</div><CategoryArrow /></a>)}</div></div></section>

      <section className="featured-section"><div className="shell"><div className="section-heading-row compact"><div><span className="eyebrow">THE GOOD SHELF</span><h2>Things we’d<br /><em>take home.</em></h2></div><div className="heading-action"><Link href="/shop" className="text-link">Shop all favorites <ArrowRight size={16} /></Link></div></div><div className="filter-row" role="tablist" aria-label="Featured product filters">{["All picks", "Notebooks", "Pens", "Gifts", "Aesthetic"].map((item) => <button key={item} role="tab" aria-selected={activeCategory === item} className={activeCategory === item ? "selected" : ""} onClick={() => setActiveCategory(item)}>{item}</button>)}</div><div className="product-rail">{featured.map((product) => <ProductCard key={product.id} product={product} onAdd={onAdd} />)}</div></div></section>

      <section className="printing-section" id="printing"><div className="shell print-grid"><div className="print-copy"><SparkleNote color="mint">From your screen to your hands</SparkleNote><h2>Print without<br /><em>the waiting room.</em></h2><p>Upload your documents, choose the details, and we’ll make the pages ready for pickup — usually before your coffee gets cold.</p><div className="print-steps"><div><b>01</b><span>Upload</span></div><div><b>02</b><span>Customize</span></div><div><b>03</b><span>Pay</span></div><div><b>04</b><span>Print</span></div></div><div className="print-actions"><button className="button button-dark" onClick={onPrint}>Start printing <ArrowRight size={16} /></button><button className="scan-button" onClick={() => window.alert("Scan the counter QR to open your in-store print queue.")}><ScanLine size={17} /> Scan to print</button></div></div><div className="print-card"><div className="print-card-top"><span className="status-dot" /> Printer 01 <span className="available">AVAILABLE</span></div><div className="print-paper"><div className="paper-lines"><span>PX1024</span><b>Your pages<br />are on their way.</b><i>Good paper,<br />good timing.</i></div><div className="paper-stamp"><Printer size={20} /><span>20–30<br />min</span></div></div><div className="print-card-foot"><span><ShieldCheck size={15} /> Secure uploads</span><span><Clock3 size={15} /> Live queue</span></div></div></div></section>

      <section className="custom-section" id="custom"><div className="shell custom-grid"><div className="custom-copy"><span className="eyebrow">THE CUSTOM STUDIO</span><h2>Make it<br /><em>more yours.</em></h2><p>For the things that deserve your name, your photo, your color, or your very specific idea.</p><button className="button button-dark" onClick={() => window.alert("Custom studio browsing is opening soon.")}>Explore custom <ArrowRight size={16} /></button><div className="custom-orbit-text">made<br />with care <span>✦</span></div></div><div className="custom-collage">{customProducts.map((item, index) => <div key={item.label} className={`custom-tile custom-tile-${index + 1} category-${item.color}`}><span>{item.art}</span><b>{item.label}</b><small>from ₹149</small></div>)}<div className="collage-note">your idea<br /><em>goes here</em> <span>↗</span></div></div></div></section>

      <section className="loyalty-section"><div className="shell loyalty-grid"><div><span className="eyebrow">A LITTLE THANK YOU</span><h2>Good habits<br /><em>come with perks.</em></h2><p>Every print order earns a stamp. Six stamps unlock a small reward, because repeat visits should feel like a high five.</p><button className="text-link" onClick={() => setStamps(stamps === 6 ? 0 : Math.min(6, stamps + 1))}>{stamps === 6 ? "Reward unlocked — reset" : "Add a pretend stamp"} <ArrowRight size={15} /></button></div><div className="loyalty-card"><div className="loyalty-card-head"><span>PRINT REWARDS</span><span>6 orders = a little treat</span></div><div className="stamp-row">{Array.from({ length: 6 }).map((_, index) => <span key={index} className={index < stamps ? "stamped" : ""}>{index < stamps ? "✦" : "○"}</span>)}</div><div className="loyalty-progress"><b>{stamps} / 6</b><span>{stamps === 6 ? "REWARD UNLOCKED" : `${6 - stamps} more to unlock`}</span></div><div className="loyalty-reward"><div className="reward-icon">✦</div><div><b>Free lamination</b><span>or your next little print treat</span></div><ChevronRight size={18} /></div></div></div></section>

      <section className="favorites-section"><div className="shell favorites-grid"><div className="favorites-copy"><SparkleNote color="pink">For the very best bits</SparkleNote><h2>Shop all<br /><em>favorites.</em></h2><p>The pens that disappear first. The notebook everyone asks about. The gift that always lands.</p><Link href="/shop" className="button button-dark">Shop bestsellers <ArrowRight size={16} /></Link><div className="favorites-mark">✦</div></div><div className="favorites-collage"><div className="favorite-photo favorite-photo-a"><img src={catalogProducts[0]?.image} alt="Soft pink grid journal" loading="lazy" decoding="async" /><span>01 / desk</span></div><div className="favorite-photo favorite-photo-b"><img src={catalogProducts[2]?.image} alt="Tiny treasure gift kit" loading="lazy" decoding="async" /><span>02 / gift</span></div><div className="favorite-note"><Star size={16} fill="currentColor" /> loved locally</div></div></div></section>

      <section className="newsletter-section"><div className="shell newsletter-inner"><div><span className="eyebrow">THE LITTLE LIST</span><h2>Good ideas,<br /><em>occasionally delivered.</em></h2></div><div><p>New arrivals, print tips, and the occasional reason to buy another notebook.</p><div className="newsletter-form"><input aria-label="Email address" placeholder="Your email address" /><button onClick={() => window.alert("Thanks — you’re on the little list.")}><ArrowRight size={17} /></button></div><small>No noise. Just the nice bits.</small></div></div></section>
    </div>
  );
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (product: Product) => void }) {
  return <article className="product-card"><div className="product-image" style={{ backgroundColor: product.swatch }}><img src={product.image} alt={product.name} loading="lazy" decoding="async" /><SaveButton />{product.badge && <span className="product-badge">{product.badge}</span>}</div><div className="product-meta"><span className="product-category">{product.category}</span><h3>{product.name}</h3><div className="product-bottom"><div><strong>₹{product.price}</strong>{product.oldPrice && <del>₹{product.oldPrice}</del>}<span className="rating"><Star size={12} fill="currentColor" /> {product.rating}</span></div><AddToCartButton onClick={() => { onAdd(product); showAddedToast(product.name); }} /></div></div></article>;
}
