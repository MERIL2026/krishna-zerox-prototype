import { useState, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, MapPin, PackageCheck } from "lucide-react";
import { toast } from "sonner";
import type { CartLine } from "@/data/store";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

export default function Checkout({ cart }: { cart: CartLine[] }) {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();
  const [fulfillmentType, setFulfillmentType] = useState<"STORE_PICKUP" | "SELF_PICKUP" | "DELIVERY">("STORE_PICKUP");
  const [address, setAddress] = useState("");
  const createOrder = trpc.orders.create.useMutation({ onSuccess: (order) => { toast.success(`Order ${order.orderNumber} created`); navigate(`/orders/${order.id}`); }, onError: (error) => toast.error(error.message) });
  const subtotal = cart.reduce((sum, line) => sum + line.price * line.quantity, 0);
  const deliveryFee = fulfillmentType === "DELIVERY" ? 50 : 0;
  const total = subtotal + deliveryFee;

  if (loading) return <div className="checkout-page"><div className="checkout-card checkout-message"><LockKeyhole size={24} /><h1>Checking your account…</h1><p>We’re getting your secure checkout ready.</p></div></div>;
  if (cart.length === 0) return <div className="checkout-page"><div className="checkout-card checkout-message"><PackageCheck size={24} /><h1>Your bag is empty</h1><p>Add something good before starting checkout.</p><Link href="/shop" className="button button-dark">Browse the shop <ArrowRight size={16} /></Link></div></div>;

  const handleGuestDemoOrder = () => {
    const demoId = Math.floor(100000 + Math.random() * 900000);
    const simulatedOrder = {
      id: demoId,
      orderNumber: `KX-DEMO-${demoId}`,
      orderStatus: "PENDING",
      paymentStatus: "AWAITING_PAYMENT",
      fulfillmentType,
      deliveryAddress: fulfillmentType === "DELIVERY" ? address || "12 Campus Drive, North Wing" : undefined,
      totalPaise: total * 100,
      createdAt: new Date().toISOString(),
      items: cart.map((line, idx) => ({
        id: idx + 1,
        productNameSnapshot: line.name,
        skuSnapshot: line.id,
        unitPricePaise: line.price * 100,
        quantity: line.quantity,
        subtotalPaise: line.price * line.quantity * 100,
      })),
      isPrototype: true,
    };
    try {
      const existing = JSON.parse(localStorage.getItem("krishna-demo-shop-orders") || "[]");
      localStorage.setItem("krishna-demo-shop-orders", JSON.stringify([simulatedOrder, ...existing]));
      localStorage.removeItem("paperlane-guest-cart");
      window.dispatchEvent(new Event("storage"));
      toast.success(`Simulated Demo Order #${simulatedOrder.orderNumber} placed!`);
      navigate(`/orders/${demoId}`);
    } catch (e) {
      console.error("Failed to save guest demo order:", e);
    }
  };

  return (
    <div className="checkout-page">
      <div className="shell checkout-shell">
        <Link href="/shop" className="checkout-back">
          <ArrowLeft size={15} /> Keep browsing
        </Link>
        <div className="checkout-heading">
          <span className="eyebrow">CHECKOUT</span>
          <h1>Good things, ready to go.</h1>
          <p>Review your order and choose how you’d like to receive it.</p>
        </div>

        {!user && (
          <div
            style={{
              background: "#fff18c",
              border: "2px solid #171515",
              borderRadius: "12px",
              padding: "14px 18px",
              marginBottom: "24px",
              fontSize: "13px",
              color: "#171515",
              fontWeight: 700,
              boxShadow: "3px 3px 0 #171515",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "10px",
            }}
          >
            <div>
              <span style={{ textTransform: "uppercase", fontSize: "10px", letterSpacing: "0.05em", display: "block" }}>
                INTERACTIVE SHOPPING PROTOTYPE
              </span>
              Checking out in guest demo mode — your simulated order will be saved locally.
            </div>
            <button
              type="button"
              onClick={() => startLogin()}
              style={{
                fontSize: "11px",
                fontWeight: 800,
                padding: "4px 10px",
                background: "#ffffff",
                border: "1.5px solid #171515",
                borderRadius: "6px",
                cursor: "pointer",
              }}
            >
              Sign in with account →
            </button>
          </div>
        )}

        <div className="checkout-grid">
          <section className="checkout-card">
            <div className="checkout-step">
              <span>01</span>
              <div>
                <h2>Fulfilment</h2>
                <p>Choose pickup or delivery.</p>
              </div>
            </div>
            <div className="fulfillment-options">
              {([
                ["STORE_PICKUP", "Store pickup", "We’ll have it ready at the counter."],
                ["SELF_PICKUP", "Self pickup", "Collect it when it suits your day."],
                ["DELIVERY", "Delivery", "We’ll bring it to your address."],
              ] as const).map(([value, label, detail]) => (
                <button
                  key={value}
                  className={fulfillmentType === value ? "fulfillment-option selected" : "fulfillment-option"}
                  onClick={() => setFulfillmentType(value)}
                >
                  <span className="fulfillment-radio" />
                  <span>
                    <strong>{label}</strong>
                    <small>{detail}</small>
                  </span>
                </button>
              ))}
            </div>
            {fulfillmentType === "DELIVERY" && (
              <label className="address-field">
                <span>
                  <MapPin size={14} /> Delivery address
                </span>
                <textarea
                  value={address}
                  onChange={(event) => setAddress(event.target.value)}
                  placeholder="House number, street, city"
                  rows={3}
                />
              </label>
            )}
            <div className="checkout-note">
              <LockKeyhole size={14} /> Prototype demonstration. No real payment will be charged.
            </div>
          </section>

          <aside className="checkout-card checkout-summary">
            <div className="checkout-step">
              <span>02</span>
              <div>
                <h2>Order summary</h2>
                <p>
                  {cart.length} good thing{cart.length === 1 ? "" : "s"} in your bag.
                </p>
              </div>
            </div>
            <div className="checkout-lines">
              {cart.map((line) => (
                <div className="checkout-line" key={line.id}>
                  <img src={line.image} alt="" />
                  <div>
                    <strong>{line.name}</strong>
                    <small>
                      {line.quantity} × ₹{line.price}
                    </small>
                  </div>
                  <b>₹{line.price * line.quantity}</b>
                </div>
              ))}
            </div>
            <div className="checkout-totals">
              <div>
                <span>Subtotal</span>
                <b>₹{subtotal}</b>
              </div>
              <div>
                <span>Delivery</span>
                <b>{deliveryFee ? `₹${deliveryFee}` : "Free"}</b>
              </div>
              <div className="checkout-total">
                <span>Total</span>
                <b>₹{total}</b>
              </div>
            </div>

            {user ? (
              <button
                className="button button-dark full-width"
                disabled={createOrder.isPending}
                onClick={() =>
                  createOrder.mutate({
                    fulfillmentType,
                    deliveryAddress: fulfillmentType === "DELIVERY" ? address : undefined,
                  })
                }
              >
                {createOrder.isPending ? "Creating order…" : "Create order · awaiting payment"} <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="button button-dark full-width"
                onClick={handleGuestDemoOrder}
              >
                Place Simulated Demo Order (₹{total}) <ArrowRight size={16} />
              </button>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}

export function OrderConfirmation({ orderId }: { orderId: number }) {
  const { user } = useAuth();
  const orderQuery = trpc.orders.get.useQuery({ orderId }, { enabled: Boolean(user), retry: false });

  // Check local demo orders if server query is not active or returns error
  const localDemoOrder = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem("krishna-demo-shop-orders");
      if (!raw) return null;
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        return list.find((o) => o.id === orderId || o.orderNumber === `KX-DEMO-${orderId}`) || null;
      }
      return null;
    } catch {
      return null;
    }
  }, [orderId]);

  if (user && orderQuery.isLoading) {
    return (
      <div className="checkout-page">
        <div className="shell checkout-shell">
          <div className="checkout-card checkout-message">
            <LockKeyhole size={24} />
            <h1>Loading your order…</h1>
            <p>Fetching verified order details from the server.</p>
          </div>
        </div>
      </div>
    );
  }

  // Use either server order or local simulated demo order
  const orderData = orderQuery.data || (localDemoOrder ? {
    order: localDemoOrder,
    items: localDemoOrder.items,
    history: [],
  } : null);

  if (!orderData) {
    return (
      <div className="checkout-page">
        <div className="shell checkout-shell">
          <div className="checkout-card checkout-message">
            <h1>Order unavailable</h1>
            <p>We could not find that order. Please check your order history.</p>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
              <Link href="/shop" className="button button-dark">Browse shop</Link>
              <Link href="/" className="button button-quiet">Back to Home</Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { order, items, history } = orderData;

  return (
    <div className="checkout-page">
      <div className="shell checkout-shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <Link href="/orders" className="checkout-back">
            <ArrowLeft size={15} /> All my orders
          </Link>
          <Link href="/shop" className="checkout-back">
            Keep browsing <ArrowRight size={15} />
          </Link>
        </div>

        <div className="checkout-heading" style={{ marginTop: "10px" }}>
          <span className="eyebrow" style={(order as any).isPrototype ? { background: "#fff18c", color: "#171515", padding: "3px 10px", borderRadius: "6px", border: "1.5px solid #171515", display: "inline-block" } : {}}>
            {(order as any).isPrototype ? "SIMULATED PROTOTYPE ORDER" : "ORDER CONFIRMATION"} · #{order.orderNumber}
          </span>
          <h1>{(order as any).isPrototype ? "Demo order received." : "Order received."}</h1>
          <p>
            {(order as any).isPrototype
              ? "This is an interactive simulated order for prototype demonstration. No payment or shipment has been processed."
              : "Your order is recorded server-side and awaiting payment. Payment gateway integration will be connected in a future release."}
          </p>
        </div>

        <div className="checkout-grid">
          <section className="checkout-card">
            <div className="checkout-step">
              <span className="confirmation-icon" style={{ width: "36px", height: "36px" }}>
                <Check size={20} />
              </span>
              <div>
                <h2>{order.orderNumber}</h2>
                <p>Status: <strong>{order.orderStatus}</strong> · Payment: <strong>{order.paymentStatus}</strong></p>
              </div>
            </div>

            <div style={{ padding: "20px 0", borderBottom: "1px solid #eadfd5" }}>
              <h3 style={{ margin: "0 0 10px", fontSize: "15px" }}>Fulfilment</h3>
              <p style={{ margin: 0, fontSize: "14px" }}>
                <strong>{order.fulfillmentType.replaceAll("_", " ")}</strong>
              </p>
              {order.deliveryAddress && (
                <p style={{ margin: "8px 0 0", color: "var(--muted)", fontSize: "13px" }}>
                  Delivery address: {order.deliveryAddress}
                </p>
              )}
            </div>

            <div style={{ padding: "20px 0", borderBottom: "1px solid #eadfd5" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>Purchased Items (Historical Snapshot)</h3>
              <div className="checkout-lines">
                {items.map((item: any) => (
                  <div className="checkout-line" key={item.id} style={{ gridTemplateColumns: "1fr auto" }}>
                    <div>
                      <strong>{item.productNameSnapshot}</strong>
                      <small>{item.skuSnapshot ? `SKU: ${item.skuSnapshot} · ` : ""}{item.quantity} × ₹{Math.round(item.unitPricePaise / 100)}</small>
                    </div>
                    <b>₹{Math.round(item.subtotalPaise / 100)}</b>
                  </div>
                ))}
              </div>
            </div>

            {history.length > 0 && (
              <div style={{ paddingTop: "20px" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "15px" }}>Status History</h3>
                <div style={{ display: "grid", gap: "8px" }}>
                  {history.map((h: any) => (
                    <div key={h.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", padding: "6px 0", borderBottom: "1px dashed #f1e8e0" }}>
                      <span>
                        {h.oldStatus ? `${h.oldStatus} → ` : "Initial state: "}
                        <strong>{h.newStatus}</strong>
                      </span>
                      <span style={{ color: "var(--muted)" }}>
                        {new Date(h.createdAt).toLocaleDateString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>

          <aside className="checkout-card checkout-summary">
            <div className="checkout-step">
              <span>₹</span>
              <div>
                <h2>Payment summary</h2>
                <p>Status: {order.paymentStatus === "UNPAID" ? "Awaiting payment" : order.paymentStatus}</p>
              </div>
            </div>

            <div className="checkout-totals">
              <div>
                <span>Subtotal</span>
                <b>₹{Math.round(order.subtotalPaise / 100)}</b>
              </div>
              <div>
                <span>Delivery</span>
                <b>{order.deliveryFeePaise ? `₹${Math.round(order.deliveryFeePaise / 100)}` : "Free"}</b>
              </div>
              {order.discountPaise > 0 && (
                <div>
                  <span>Discount</span>
                  <b>-₹{Math.round(order.discountPaise / 100)}</b>
                </div>
              )}
              <div className="checkout-total">
                <span>Total</span>
                <b>₹{Math.round(order.totalPaise / 100)}</b>
              </div>
            </div>

            <div className="checkout-note" style={{ margin: "0 0 16px" }}>
              <LockKeyhole size={14} /> Unpaid order foundation created. In production, payment gateway callback will mark this as PAID.
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              <Link href="/orders" className="button button-dark full-width">
                View all my orders <ArrowRight size={15} />
              </Link>
              <Link href="/shop" className="button button-quiet full-width">
                Back to shop
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
