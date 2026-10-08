import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Heart,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import type { CartLine } from "@/data/store";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";

const baseNavItems = [
  { label: "Shop", href: "/shop" },
  { label: "Printing", href: "#printing" },
  { label: "Custom", href: "#custom" },
  { label: "Categories", href: "#categories" },
  { label: "About", href: "#about" },
];

type ShellProps = {
  children: React.ReactNode;
  cart: CartLine[];
  onAdd: (item: CartLine) => void;
  onUpdate: (id: string, delta: number) => void;
  onRemove: (id: string) => void;
  onPrint: () => void;
};

export function StorefrontLayout({ children, cart, onAdd, onUpdate, onRemove, onPrint }: ShellProps) {
  const { user } = useAuth();
  const [cartOpen, setCartOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [location, navigate] = useLocation();
  const count = cart.reduce((sum, line) => sum + line.quantity, 0);

  const navItems = useMemo(() => {
    const items = [...baseNavItems];
    if (user) {
      items.push({ label: "My Orders", href: "/orders" });
    }
    if (user && ["owner", "admin", "staff"].includes(user.role)) {
      items.push({ label: "Admin", href: "/admin" });
    }
    return items;
  }, [user]);

  const openPrint = () => {
    setPrintOpen(true);
    onPrint();
  };

  return (
    <div className="min-h-screen bg-cream text-ink">
      <header className="site-header">
        <div className="shell header-inner">
          <Link href="/" className="brand-mark" aria-label="Go to homepage">
            <span className="brand-symbol"><span>✦</span></span>
            <span className="brand-name">[SHOP<br /><em>NAME]</em></span>
          </Link>

          <nav className="desktop-nav" aria-label="Primary navigation">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} className={location === item.href ? "active" : ""}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="header-actions">
            <button className="icon-button search-button" aria-label="Search products" onClick={() => navigate("/shop")}><Search size={18} /></button>
            <button
              className="icon-button account-button"
              aria-label={user ? "My Orders" : "Sign in"}
              title={user ? `Signed in · My Orders` : "Sign in"}
              onClick={() => {
                if (user) {
                  navigate("/orders");
                } else {
                  startLogin();
                }
              }}
            >
              <UserRound size={18} />
            </button>
            <button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`Open cart with ${count} items`}>
              <ShoppingBag size={18} /> <span className="cart-label">Cart</span><b>{count}</b>
            </button>
            <button className="print-button" onClick={openPrint}>Print now <ArrowRight size={16} /></button>
            <button className="mobile-menu" aria-label={menuOpen ? "Close navigation" : "Open navigation"} aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}>{menuOpen ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
        {menuOpen && (
          <nav className="mobile-nav" aria-label="Mobile navigation">
            {navItems.map((item) => (
              <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)}>
                {item.label}<ArrowRight size={15} />
              </a>
            ))}
            {!user && (
              <button onClick={() => { setMenuOpen(false); startLogin(); }}>
                Sign In <ArrowRight size={15} />
              </button>
            )}
            <button onClick={() => { setMenuOpen(false); openPrint(); }}>
              Print now <ArrowRight size={15} />
            </button>
          </nav>
        )}
      </header>

      <main>{children}</main>

      <footer className="site-footer" id="about">
        <div className="shell footer-grid">
          <div className="footer-brand">
            <div className="brand-mark footer-mark"><span className="brand-symbol"><span>✦</span></span><span className="brand-name">[SHOP<br /><em>NAME]</em></span></div>
            <p>A neighborhood stationery world for ideas, gifts, and making things tangible.</p>
            <div className="footer-socials"><span>ig</span><span>pi</span><span>in</span></div>
          </div>
          <div><p className="footer-kicker">Explore</p><a href="/shop">Shop all</a><a href="#categories">Categories</a><a href="#custom">Custom studio</a><a href="#printing">Smart printing</a></div>
          <div><p className="footer-kicker">Visit</p><a href="#about">12 Paper Street</a><a href="#about">Mon–Sat · 9:30–8</a><a href="#about">Find the counter ↗</a><a href="#about">hello@[shopname].in</a></div>
          <div className="footer-note"><span className="tape tape-yellow">A LITTLE NOTE</span><p>Good paper makes ordinary days feel more considered.</p><button className="text-link" onClick={() => toast("You're on the list — watch this space")}>Join the little list <ArrowRight size={15} /></button></div>
        </div>
        <div className="shell footer-bottom"><span>© 2026 [SHOP NAME]. Built for good ideas.</span><span>Privacy · Terms · Accessibility</span></div>
      </footer>

      {cartOpen && <CartDrawer cart={cart} onClose={() => setCartOpen(false)} onUpdate={onUpdate} onRemove={onRemove} />}
      {printOpen && <PrintModal onClose={() => setPrintOpen(false)} />}
      <nav className="mobile-bottom-nav" aria-label="Quick navigation"><a href="/"><span>⌂</span>Home</a><a href="/shop"><span>⌕</span>Shop</a><button onClick={openPrint}><span>▣</span>Print</button><button onClick={() => setCartOpen(true)}><span>♧</span>Cart{count > 0 && <b>{count}</b>}</button></nav>
    </div>
  );
}

function CartDrawer({ cart, onClose, onUpdate, onRemove }: { cart: CartLine[]; onClose: () => void; onUpdate: (id: string, delta: number) => void; onRemove: (id: string) => void }) {
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Shopping cart">
      <button className="overlay-scrim" aria-label="Close cart" onClick={onClose} />
      <aside className="cart-drawer">
        <div className="drawer-head"><div><span className="eyebrow">YOUR BAG</span><h2>A few good things</h2></div><button className="close-button" onClick={onClose} aria-label="Close cart"><X size={18} /></button></div>
        {cart.length === 0 ? <div className="empty-cart"><div className="empty-cart-art">✦</div><h3>Your bag is taking a little pause.</h3><p>Browse the shop and add something that makes your desk happier.</p><Link href="/shop" className="button button-dark" onClick={onClose}>Browse shop <ArrowRight size={16} /></Link></div> : <>
          <div className="cart-lines">{cart.map((line) => <div className="cart-line" key={line.id}><img src={line.image} alt="" loading="lazy" decoding="async" /><div className="cart-line-copy"><strong>{line.name}</strong><span>{line.category}</span><div className="line-controls"><div className="quantity-control"><button onClick={() => onUpdate(line.id, -1)} aria-label={`Decrease ${line.name}`}><Minus size={13} /></button><b>{line.quantity}</b><button onClick={() => onUpdate(line.id, 1)} aria-label={`Increase ${line.name}`}><Plus size={13} /></button></div><button className="remove-line" onClick={() => onRemove(line.id)} aria-label={`Remove ${line.name}`}><Trash2 size={14} /></button></div></div><strong className="line-price">₹{line.price * line.quantity}</strong></div>)}</div>
          <div className="cart-summary"><div><span>Subtotal</span><strong>₹{subtotal}</strong></div><small>Taxes and delivery are calculated at checkout.</small><Link href="/checkout" className="button button-dark full-width" onClick={onClose}>Checkout <ArrowRight size={16} /></Link></div>
        </>}
      </aside>
    </div>
  );
}

function PrintModal({ onClose }: { onClose: () => void }) {
  const [fileName, setFileName] = useState("");
  const [paper, setPaper] = useState("A4");
  const [color, setColor] = useState("Colour");
  const [sides, setSides] = useState("Single side");
  const [copies, setCopies] = useState(1);
  const [finish, setFinish] = useState("None");
  const [fulfilment, setFulfilment] = useState("Store pickup");
  const estimate = useMemo(() => {
    const base = color === "Colour" ? 12 : 3.5;
    const paperAdd = paper === "A3" ? 8 : paper === "Legal" ? 4 : 0;
    const sideAdd = sides === "Double side" ? 3 : 0;
    const finishAdd = finish === "Lamination" ? 18 : finish === "Binding" ? 35 : finish === "Stapling" ? 8 : 0;
    return Math.round((base + paperAdd + sideAdd + finishAdd) * copies);
  }, [color, paper, sides, finish, copies]);

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Start a print order">
      <button className="overlay-scrim" aria-label="Close printing dialog" onClick={onClose} />
      <section className="print-modal">
        <div className="print-modal-head"><div><span className="eyebrow">SMART PRINTING</span><h2>From file to finished.</h2><p>Upload from home, or step into the store counter flow.</p></div><button className="close-button" onClick={onClose} aria-label="Close print dialog"><X size={18} /></button></div>
        <div className="print-flow"><span className="done"><Check size={13} /> 01 Upload</span><span>02 Configure</span><span>03 Review</span><span>04 Pay</span><span>05 Queue</span></div>
        <label className={`upload-zone ${fileName ? "has-file" : ""}`}><input type="file" onChange={(event) => setFileName(event.target.files?.[0]?.name ?? "")} /><UploadCloud size={25} /><strong>{fileName || "Drop a file here or browse"}</strong><small>PDF, DOCX, JPG or PNG · up to 25MB</small></label>
        <div className="print-options">
          <label><span>Paper size</span><select value={paper} onChange={(e) => setPaper(e.target.value)}><option>A4</option><option>A3</option><option>Legal</option></select></label>
          <label><span>Colour</span><select value={color} onChange={(e) => setColor(e.target.value)}><option>Colour</option><option>Black & white</option></select></label>
          <label><span>Sides</span><select value={sides} onChange={(e) => setSides(e.target.value)}><option>Single side</option><option>Double side</option></select></label>
          <label><span>Finishing</span><select value={finish} onChange={(e) => setFinish(e.target.value)}><option>None</option><option>Stapling</option><option>Binding</option><option>Lamination</option></select></label>
          <label><span>Copies</span><div className="number-stepper"><button onClick={() => setCopies(Math.max(1, copies - 1))} aria-label="Decrease copies"><Minus size={14} /></button><b>{copies}</b><button onClick={() => setCopies(copies + 1)} aria-label="Increase copies"><Plus size={14} /></button></div></label>
          <label><span>Fulfilment</span><select value={fulfilment} onChange={(e) => setFulfilment(e.target.value)}><option>Store pickup</option><option>Self pickup</option><option>Delivery</option></select></label>
        </div>
        <div className="print-bottom"><div><span className="eyebrow">ESTIMATED TOTAL</span><strong>₹{estimate}</strong><small>{fileName ? `${copies} copy · ${paper} · ${color}` : "Ready in approx. 20–30 min"}</small></div><button className="button button-dark" onClick={() => { toast.success(fileName ? `${fileName} reviewed — Printer 01 is available` : "Choose a file to start printing"); if (fileName) onClose(); }}>Review &amp; continue <ArrowRight size={16} /></button></div>
      </section>
    </div>
  );
}

export function SaveButton() {
  const [saved, setSaved] = useState(false);
  return <button className={`save-button ${saved ? "saved" : ""}`} aria-label="Save item" onClick={() => { setSaved(!saved); toast(saved ? "Removed from saved items" : "Saved for later"); }}><Heart size={16} fill={saved ? "currentColor" : "none"} /></button>;
}

export function CategoryArrow() {
  return <span className="category-arrow"><ArrowRight size={16} /></span>;
}

export function FilterPill({ label, active, onClick }: { label: string; active?: boolean; onClick?: () => void }) {
  return <button className={`filter-pill ${active ? "active" : ""}`} onClick={onClick}>{label}<ChevronDown size={14} /></button>;
}

export function AddToCartButton({ onClick }: { onClick: () => void }) {
  return <button className="add-button" onClick={onClick}>Add to bag <Plus size={15} /></button>;
}

export function showAddedToast(name: string) {
  toast.success(`${name} added to your bag`, { description: "Keep browsing — your picks are safe." });
}

export function SectionRule({ children }: { children: React.ReactNode }) {
  return <div className="section-rule"><span>{children}</span><span className="rule-line" /></div>;
}

export function SparkleNote({ children, color = "pink" }: { children: React.ReactNode; color?: string }) {
  return <span className={`sparkle-note note-${color}`}><Sparkles size={13} /> {children}</span>;
}
