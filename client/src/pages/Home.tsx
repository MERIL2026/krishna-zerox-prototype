import { useState } from "react";
import {
  ArrowRight,
  Check,
  ChevronRight,
  Clock3,
  CreditCard,
  FileCheck2,
  FolderUp,
  MapPin,
  PackageCheck,
  Printer,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  WandSparkles,
  Zap,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { categories, customProducts, products, type Product } from "@/data/store";
import {
  AddToCartButton,
  CategoryArrow,
  SaveButton,
  SectionRule,
  showAddedToast,
  SparkleNote,
} from "@/components/StorefrontShell";
import { trpc } from "@/lib/trpc";

export default function Home({
  onAdd,
  onPrint,
}: {
  onAdd: (product: Product) => void;
  onPrint: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState("All picks");
  const [stamps, setStamps] = useState(5);
  const shouldReduceMotion = useReducedMotion();

  const handleResetDemoState = () => {
    try {
      localStorage.removeItem("krishna-zerox-print-orders");
      localStorage.removeItem("paperlane-guest-cart");
      localStorage.removeItem("krishna-demo-shop-orders");
      window.dispatchEvent(new CustomEvent("krishna-print-orders-updated"));
      window.dispatchEvent(new Event("storage"));
      toast.success("Prototype data reset to initial clean state");
    } catch {
      toast.error("Failed to reset prototype data");
    }
  };

  const catalogQuery = trpc.catalog.list.useQuery(undefined, { staleTime: 60_000 });
  const categoriesQuery = trpc.catalog.categories.useQuery(undefined, { staleTime: 60_000 });
  const catalogProducts = catalogQuery.data?.length ? catalogQuery.data : products;

  const displayCategories = categoriesQuery.data?.length
    ? categoriesQuery.data.map((c) => {
        const match = categories.find((fc) => fc.label.toLowerCase() === c.name.toLowerCase());
        return {
          label: c.name,
          kicker: c.description || match?.kicker || "Everyday magic",
          color: c.color || match?.color || "cream",
          art: match?.art || "✦",
          count: match?.count || "Curated picks",
        };
      })
    : categories;

  const featured =
    activeCategory === "All picks"
      ? catalogProducts.slice(0, 4)
      : catalogProducts.filter(
          (product) =>
            product.category === activeCategory ||
            (activeCategory === "Aesthetic" && product.category === "Custom")
        );

  // Motion variants
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: shouldReduceMotion ? 0 : 0.12,
        delayChildren: 0.05,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: shouldReduceMotion ? 0 : 20 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.45, ease: [0.22, 0.8, 0.24, 1] as const },
    },
  };

  const visualVariants: Variants = {
    hidden: { opacity: 0, scale: shouldReduceMotion ? 1 : 0.96, y: shouldReduceMotion ? 0 : 24 },
    show: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 0.8, 0.24, 1] as const },
    },
  };

  return (
    <div>
      {/* =====================================================================
          HERO SECTION (Editorial Layout, Asymmetry, Staggered Load)
          ===================================================================== */}
      <section className="hero-section">
        <div className="shell hero-grid">
          <motion.div
            className="hero-copy"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            <motion.div variants={itemVariants}>
              <SparkleNote color="yellow">A nicer kind of everyday</SparkleNote>
            </motion.div>

            <motion.h1 variants={itemVariants}>
              Make room<br />
              <span>for good ideas.</span>
              <em>and everyday paper joy</em>
            </motion.h1>

            <motion.p variants={itemVariants}>
              Stationery, thoughtful gifts and fast digital printing for the lists, letters,
              and little projects that make each day feel more considered.
            </motion.p>

            <motion.div className="hero-actions" variants={itemVariants}>
              <Link href="/shop" className="button button-dark">
                Shop the good stuff <ArrowRight size={17} />
              </Link>
              <button className="button button-quiet" onClick={onPrint}>
                <span className="button-icon">
                  <Printer size={16} />
                </span>
                Print something
              </button>
            </motion.div>

            <motion.div className="hero-proof" variants={itemVariants}>
              <span>
                <Check size={14} /> Curated in-store
              </span>
              <span>
                <Check size={14} /> Pickup when ready
              </span>
              <span>
                <Check size={14} /> Fast counter Xerox
              </span>
            </motion.div>
          </motion.div>

          <motion.div
            className="hero-visual"
            variants={visualVariants}
            initial="hidden"
            animate="show"
          >
            <span className="hero-tape tape-pink">NEW IN THE SHOP</span>
            <div className="hero-photo-frame">
              <img
                src="https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1200&q=85"
                alt="Curated arrangement of colorful stationery, notebooks, and paper goods at Krishna Xerox"
              />
              <div className="hero-photo-tag">
                <span>01</span>
                <b>Desk<br />joy</b>
              </div>
            </div>
            <div className="hero-sticker sticker-yellow">
              Paper<br />
              <em>people</em>
              <span>✦</span>
            </div>
            <div className="hero-orbit orbit-one" aria-hidden="true" />
            <div className="hero-orbit orbit-two" aria-hidden="true" />
          </motion.div>
        </div>
        <div className="hero-scribble" aria-hidden="true">✳</div>
      </section>

      {/* =====================================================================
          SERVICE STRIP (4 Distinct Pillars)
          ===================================================================== */}
      <section className="service-strip">
        <div className="shell service-grid">
          <div className="service-intro">
            <span className="eyebrow">THE QUICK BIT</span>
            <strong>Good things,<br />without the wait.</strong>
          </div>
          <div className="service-item">
            <span className="service-icon">
              <Zap size={18} />
            </span>
            <div>
              <b>Fast printing</b>
              <span>Upload, customize, done.</span>
            </div>
          </div>
          <div className="service-item">
            <span className="service-icon">
              <PackageCheck size={18} />
            </span>
            <div>
              <b>Easy pickup</b>
              <span>Order online, collect at counter.</span>
            </div>
          </div>
          <div className="service-item">
            <span className="service-icon">
              <WandSparkles size={18} />
            </span>
            <div>
              <b>Custom made</b>
              <span>Your idea, our good paper.</span>
            </div>
          </div>
          <div className="service-item">
            <span className="service-icon">
              <MapPin size={18} />
            </span>
            <div>
              <b>Local &amp; close</b>
              <span>12 Paper Street, hello.</span>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          PHASE 3: CLIENT PROTOTYPE TEST STRIP
          ===================================================================== */}
      <section className="prototype-strip" aria-label="Interactive Prototype Experience">
        <div className="shell">
          <div className="prototype-header">
            <span className="prototype-pill">
              <Sparkles size={12} /> INTERACTIVE PROTOTYPE
            </span>
            <h2>Experience Krishna Xerox</h2>
            <p>
              From quick document printing to everyday stationery shopping — try both experiences yourself.
            </p>
          </div>

          <div className="prototype-cards-grid">
            {/* CARD A: SMART XEROX */}
            <div className="prototype-card">
              <div>
                <div className="prototype-card-top">
                  <span className="prototype-badge" style={{ background: "#a8e8ef", color: "#171515" }}>
                    DOCUMENT PRINTING
                  </span>
                  <span className="w-10 h-10 rounded-full border-2 border-ink bg-cyan flex items-center justify-center text-ink shadow-xs">
                    <Printer size={18} />
                  </span>
                </div>

                <h3>Print in 3 Easy Steps</h3>
                <p>
                  Upload your document, choose your print settings and confirm your request.
                </p>

                {/* Journey indicator: Upload -> Customize -> Confirm */}
                <div className="prototype-journey-box">
                  <span className="prototype-journey-label">Interactive Journey Flow</span>
                  <div className="prototype-journey-steps">
                    <span className="prototype-step-tag">01 Upload</span>
                    <span className="prototype-journey-arrow">→</span>
                    <span className="prototype-step-tag">02 Customize</span>
                    <span className="prototype-journey-arrow">→</span>
                    <span className="prototype-step-tag">03 Confirm</span>
                  </div>
                </div>

                <div className="prototype-bullets">
                  <div className="prototype-bullet-item">
                    <Check size={14} className="text-emerald-700" />
                    <span>PDF, DOCX &amp; photo validation with 25MB check</span>
                  </div>
                  <div className="prototype-bullet-item">
                    <Check size={14} className="text-emerald-700" />
                    <span>Dynamic INR calculation (Paper GSM, Duplex, Binding, Lamination)</span>
                  </div>
                  <div className="prototype-bullet-item">
                    <Check size={14} className="text-emerald-700" />
                    <span>Instant demo reference generation synced to Admin Queue</span>
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={onPrint}
                  className="prototype-card-btn"
                  style={{ background: "var(--ink)", color: "var(--paper)" }}
                >
                  <Printer size={16} /> Try Xerox Demo <ArrowRight size={15} />
                </button>
              </div>
            </div>

            {/* CARD B: ONLINE SHOPPING */}
            <div className="prototype-card">
              <div>
                <div className="prototype-card-top">
                  <span className="prototype-badge" style={{ background: "#dff86b", color: "#171515" }}>
                    STATIONERY STORE
                  </span>
                  <span className="w-10 h-10 rounded-full border-2 border-ink bg-lime flex items-center justify-center text-ink shadow-xs">
                    <ShoppingBag size={18} />
                  </span>
                </div>

                <h3>Shop Stationery Online</h3>
                <p>
                  Explore stationery, add products to your cart and try the checkout experience.
                </p>

                {/* Journey indicator: Browse -> Add to Cart -> Checkout */}
                <div className="prototype-journey-box">
                  <span className="prototype-journey-label">Interactive Journey Flow</span>
                  <div className="prototype-journey-steps">
                    <span className="prototype-step-tag">01 Browse</span>
                    <span className="prototype-journey-arrow">→</span>
                    <span className="prototype-step-tag">02 Add to Cart</span>
                    <span className="prototype-journey-arrow">→</span>
                    <span className="prototype-step-tag">03 Checkout</span>
                  </div>
                </div>

                <div className="prototype-bullets">
                  <div className="prototype-bullet-item">
                    <Check size={14} className="text-emerald-700" />
                    <span>Explore notebooks, pens, planners, and studio supplies</span>
                  </div>
                  <div className="prototype-bullet-item">
                    <Check size={14} className="text-emerald-700" />
                    <span>Slide-out bag drawer with real-time quantity controls</span>
                  </div>
                  <div className="prototype-bullet-item">
                    <Check size={14} className="text-emerald-700" />
                    <span>Simulated prototype checkout with transparent order breakdown</span>
                  </div>
                </div>
              </div>

              <div>
                <Link
                  href="/shop"
                  className="prototype-card-btn"
                  style={{ background: "#dff86b", color: "#171515" }}
                >
                  <ShoppingBag size={16} /> Try Shopping Demo <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button
              type="button"
              onClick={handleResetDemoState}
              style={{
                background: "none",
                border: "none",
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--muted)",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                textDecoration: "underline",
              }}
            >
              <RotateCcw size={12} /> Reset Demo Data (Clears local demo orders &amp; cart)
            </button>
          </div>
        </div>
      </section>

      {/* =====================================================================
          01 / CATEGORIES SECTION
          ===================================================================== */}
      <motion.section
        className="categories-section"
        id="categories"
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 0.8, 0.24, 1] }}
      >
        <div className="shell">
          <SectionRule>Find your kind of thing <span>✦</span></SectionRule>
          <div className="section-heading-row">
            <div>
              <div className="section-eyebrow-row">
                <span className="section-number">01</span>
                <span className="eyebrow">SHOP BY CATEGORY</span>
              </div>
              <h2>
                A little world<br />
                <em>of useful joy.</em>
              </h2>
            </div>
            <p>
              From the desk essentials you reach for daily to the lovely little
              surprises you didn’t know you needed.
            </p>
          </div>
          <div className="category-grid">
            {displayCategories.map((category) => (
              <a
                href={
                  category.label === "Printing"
                    ? "#printing"
                    : category.label === "Custom"
                    ? "#custom"
                    : "/shop"
                }
                key={category.label}
                className={`category-card category-${category.color}`}
              >
                <div className="category-copy">
                  <span>{category.kicker}</span>
                  <h3>{category.label}</h3>
                  <small>{category.count}</small>
                </div>
                <div className="category-art" aria-hidden="true">
                  {category.art}
                </div>
                <CategoryArrow />
              </a>
            ))}
          </div>
        </div>
      </motion.section>

      {/* =====================================================================
          02 / FEATURED PRODUCTS SECTION
          ===================================================================== */}
      <motion.section
        className="featured-section"
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 0.8, 0.24, 1] }}
      >
        <div className="shell">
          <div className="section-heading-row">
            <div>
              <div className="section-eyebrow-row">
                <span className="section-number">02</span>
                <span className="eyebrow">THE GOOD SHELF</span>
              </div>
              <h2>
                Things we’d<br />
                <em>take home.</em>
              </h2>
            </div>
            <div className="heading-action">
              <Link href="/shop" className="text-link">
                Shop all favorites <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="filter-row" role="tablist" aria-label="Featured product filters">
            {["All picks", "Notebooks", "Pens", "Gifts", "Aesthetic"].map((item) => (
              <button
                key={item}
                role="tab"
                aria-selected={activeCategory === item}
                className={activeCategory === item ? "selected" : ""}
                onClick={() => setActiveCategory(item)}
              >
                {item}
              </button>
            ))}
          </div>

          <div className="product-rail">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} onAdd={onAdd} />
            ))}
          </div>
        </div>
      </motion.section>

      {/* =====================================================================
          03 / SMART PRINTING SECTION (Signature 4-Step Workflow)
          ===================================================================== */}
      <motion.section
        className="printing-section"
        id="printing"
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 0.8, 0.24, 1] }}
      >
        <div className="shell print-grid">
          <div className="print-copy">
            <div className="section-eyebrow-row">
              <span className="section-number">03</span>
              <SparkleNote color="mint">From your screen to your hands</SparkleNote>
            </div>
            <h2>
              Print without<br />
              <em>the waiting room.</em>
            </h2>
            <p>
              Upload documents or photos, select your paper and finish, and we’ll have
              your pages packaged and ready for pickup at our counter in 20–30 minutes.
            </p>

            {/* Standardized 4-Step Workflow: 01 Upload -> 02 Customize -> 03 Pay -> 04 Collect */}
            <div className="print-steps">
              <div>
                <b>01 UPLOAD</b>
                <span>PDF, Word, JPG</span>
              </div>
              <div>
                <b>02 CUSTOMIZE</b>
                <span>Color, paper, bind</span>
              </div>
              <div>
                <b>03 PAY</b>
                <span>Online or counter</span>
              </div>
              <div>
                <b>04 COLLECT</b>
                <span>Ready in 20 min</span>
              </div>
            </div>

            <div className="print-actions">
              <button className="button button-dark" onClick={onPrint}>
                Start printing <ArrowRight size={16} />
              </button>
              <button
                className="scan-button"
                onClick={() =>
                  window.alert("Scan the counter QR to open your instant in-store print queue.")
                }
              >
                <ScanLine size={17} /> Scan at counter
              </button>
            </div>
          </div>

          <div className="print-card">
            <div className="print-card-top">
              <div className="flex items-center gap-2">
                <span className="status-dot" />
                <strong className="font-bold text-sm">Printer 01</strong>
              </div>
              <span className="available">READY &amp; ACTIVE</span>
            </div>
            <div className="print-paper">
              <div className="paper-lines">
                <span>KX-ORDER #4029</span>
                <b>Your pages<br />are on their way.</b>
                <i>Crisp ink, heavy stock, clean finish.</i>
              </div>
              <div className="paper-stamp">
                <Printer size={22} />
                <span>20–30<br />min queue</span>
              </div>
            </div>
            <div className="print-card-foot">
              <span>
                <ShieldCheck size={15} /> Private &amp; secure file handling
              </span>
              <span>
                <Clock3 size={15} /> Live counter pickup
              </span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* =====================================================================
          04 / CUSTOM STUDIO SECTION
          ===================================================================== */}
      <motion.section
        className="custom-section"
        id="custom"
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 0.8, 0.24, 1] }}
      >
        <div className="shell custom-grid">
          <div className="custom-copy">
            <div className="section-eyebrow-row">
              <span className="section-number">04</span>
              <span className="eyebrow">THE CUSTOM STUDIO</span>
            </div>
            <h2>
              Make it<br />
              <em>more yours.</em>
            </h2>
            <p>
              For the things that deserve your name, your photo, your favorite colors,
              or your very specific idea. Personal gifts made with craft paper.
            </p>
            <button
              className="button button-dark"
              onClick={() => window.alert("Custom studio online ordering is opening soon.")}
            >
              Explore custom <ArrowRight size={16} />
            </button>
            <div className="custom-orbit-text" aria-hidden="true">
              made<br />with care <span>✦</span>
            </div>
          </div>

          <div className="custom-collage">
            {customProducts.map((item, index) => (
              <div
                key={item.label}
                className={`custom-tile custom-tile-${index + 1} category-${item.color}`}
              >
                <span>{item.art}</span>
                <b>{item.label}</b>
                <small>from ₹149</small>
              </div>
            ))}
            <div className="collage-note">
              your idea<br />
              <em>goes here</em> <span>↗</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* =====================================================================
          05 / LOYALTY REWARDS SECTION
          ===================================================================== */}
      <motion.section
        className="loyalty-section"
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 0.8, 0.24, 1] }}
      >
        <div className="shell loyalty-grid">
          <div>
            <div className="section-eyebrow-row">
              <span className="section-number">05</span>
              <span className="eyebrow">A LITTLE THANK YOU</span>
            </div>
            <h2>
              Good habits<br />
              <em>come with perks.</em>
            </h2>
            <p>
              Every print or stationery visit earns a stamp on your card. Six stamps
              unlock a small reward, because repeat visits should feel like a high five.
            </p>
            <button
              className="text-link"
              onClick={() => setStamps(stamps === 6 ? 0 : Math.min(6, stamps + 1))}
            >
              {stamps === 6 ? "Reward unlocked — reset card" : "Add a stamp to preview"}
              <ArrowRight size={15} />
            </button>
          </div>

          <div className="loyalty-card">
            <div className="loyalty-card-head">
              <span>PRINT REWARDS CARD</span>
              <span>6 VISITS = A LITTLE TREAT</span>
            </div>
            <div className="stamp-row">
              {Array.from({ length: 6 }).map((_, index) => (
                <span
                  key={index}
                  className={index < stamps ? "stamped" : ""}
                  title={index < stamps ? "Stamped!" : "Empty stamp slot"}
                >
                  {index < stamps ? "✦" : "○"}
                </span>
              ))}
            </div>
            <div className="loyalty-progress">
              <b>{stamps} / 6 stamps</b>
              <span>
                {stamps === 6 ? "REWARD UNLOCKED! ✦" : `${6 - stamps} more to unlock treat`}
              </span>
            </div>
            <div className="loyalty-reward">
              <div className="reward-icon">✦</div>
              <div>
                <b>Free document lamination</b>
                <span>or ₹50 off your next print or notebook order</span>
              </div>
              <ChevronRight size={18} />
            </div>
          </div>
        </div>
      </motion.section>

      {/* =====================================================================
          06 / BESTSELLERS SECTION
          ===================================================================== */}
      <motion.section
        className="favorites-section"
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 0.8, 0.24, 1] }}
      >
        <div className="shell favorites-grid">
          <div className="favorites-copy">
            <div className="section-eyebrow-row">
              <span className="section-number">06</span>
              <SparkleNote color="pink">For the very best bits</SparkleNote>
            </div>
            <h2>
              Shop all<br />
              <em>favorites.</em>
            </h2>
            <p>
              The pens that disappear first. The notebook everyone asks about. The
              desk tape that fixes everything with style.
            </p>
            <Link href="/shop" className="button button-dark">
              Shop bestsellers <ArrowRight size={16} />
            </Link>
            <div className="favorites-mark" aria-hidden="true">✦</div>
          </div>

          <div className="favorites-collage">
            <div className="favorite-photo favorite-photo-a">
              <img
                src={catalogProducts[0]?.image}
                alt="Soft pink grid journal"
                loading="lazy"
                decoding="async"
              />
              <span>01 / DESK</span>
            </div>
            <div className="favorite-photo favorite-photo-b">
              <img
                src={catalogProducts[2]?.image}
                alt="Tiny treasure gift kit"
                loading="lazy"
                decoding="async"
              />
              <span>02 / GIFT</span>
            </div>
            <div className="favorite-note">
              <Star size={16} fill="currentColor" /> loved locally in-store
            </div>
          </div>
        </div>
      </motion.section>

      {/* =====================================================================
          07 / NEWSLETTER SECTION
          ===================================================================== */}
      <motion.section
        className="newsletter-section"
        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.5, ease: [0.22, 0.8, 0.24, 1] }}
      >
        <div className="shell newsletter-inner">
          <div>
            <div className="section-eyebrow-row">
              <span className="section-number" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                07
              </span>
              <span className="eyebrow" style={{ color: "var(--yellow)" }}>THE LITTLE LIST</span>
            </div>
            <h2>
              Good ideas,<br />
              <em>occasionally delivered.</em>
            </h2>
          </div>
          <div>
            <p>
              New paper arrivals, printing tips, and the occasional reminder to buy
              another notebook.
            </p>
            <form
              className="newsletter-form"
              onSubmit={(e) => {
                e.preventDefault();
                window.alert("Thanks for subscribing to the little list!");
              }}
            >
              <input
                aria-label="Email address"
                placeholder="Your email address"
                type="email"
                required
              />
              <button type="submit" aria-label="Subscribe to newsletter">
                <ArrowRight size={18} />
              </button>
            </form>
            <small>No spam or clutter. Just the nice stationery bits.</small>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function ProductCard({
  product,
  onAdd,
}: {
  product: Product;
  onAdd: (product: Product) => void;
}) {
  return (
    <article className="product-card">
      <div className="product-image" style={{ backgroundColor: product.swatch }}>
        <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
        <SaveButton />
        {product.badge && <span className="product-badge">{product.badge}</span>}
      </div>
      <div className="product-meta">
        <span className="product-category">{product.category}</span>
        <h3>{product.name}</h3>
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
    </article>
  );
}
