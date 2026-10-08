import { ArrowLeft, ArrowRight, Clock, FileText, LockKeyhole, PackageCheck, ShoppingBag } from "lucide-react";
import { Link } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";

const currency = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

const statusClass = (status: string) => {
  switch (status) {
    case "PENDING": return "status-badge-pending";
    case "CONFIRMED": return "status-badge-confirmed";
    case "PROCESSING": return "status-badge-processing";
    case "READY": return "status-badge-ready";
    case "OUT_FOR_DELIVERY": return "status-badge-out";
    case "DELIVERED":
    case "COMPLETED": return "status-badge-completed";
    case "CANCELLED":
    case "REFUNDED": return "status-badge-cancelled";
    default: return "status-badge-pending";
  }
};

export default function CustomerOrders() {
  const { user, loading } = useAuth();
  const ordersQuery = trpc.orders.mine.useQuery(undefined, { enabled: Boolean(user), retry: false });

  if (loading) {
    return (
      <div className="customer-orders-page">
        <div className="shell">
          <div className="checkout-card checkout-message">
            <LockKeyhole size={24} />
            <h1>Checking your account…</h1>
            <p>Loading your orders.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="customer-orders-page">
        <div className="shell">
          <div className="checkout-card checkout-message">
            <LockKeyhole size={24} />
            <h1>Sign in to see your orders</h1>
            <p>Your orders stay attached to your Paperlane account.</p>
            <button className="button button-dark" onClick={() => startLogin()}>
              Sign in to continue <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  const orders = ordersQuery.data ?? [];

  return (
    <div className="customer-orders-page">
      <div className="shell">
        <Link href="/shop" className="checkout-back">
          <ArrowLeft size={15} /> Back to shop
        </Link>

        <div className="customer-orders-head">
          <div>
            <span className="eyebrow">ACCOUNT · ORDERS</span>
            <h1>My Orders.</h1>
          </div>
          <Link href="/shop" className="button button-dark">
            <ShoppingBag size={15} /> Continue shopping
          </Link>
        </div>

        {ordersQuery.isLoading && (
          <div className="customer-order-card">
            <p>Loading your order history…</p>
          </div>
        )}

        {ordersQuery.isError && (
          <div className="customer-order-card">
            <p>We could not load your orders. Please try again later.</p>
          </div>
        )}

        {!ordersQuery.isLoading && orders.length === 0 && (
          <div className="checkout-card checkout-message">
            <PackageCheck size={28} />
            <h1>No orders yet</h1>
            <p>When you complete a checkout, your receipt and progress updates will appear right here.</p>
            <Link href="/shop" className="button button-dark">
              Explore the shop <ArrowRight size={16} />
            </Link>
          </div>
        )}

        {orders.length > 0 && (
          <div className="customer-orders-grid">
            {orders.map((order) => (
              <article className="customer-order-card" key={order.id}>
                <div className="customer-order-card-head">
                  <div>
                    <span className="eyebrow">{order.orderNumber}</span>
                    <h3>{order.fulfillmentType.replaceAll("_", " ")}</h3>
                    <small>Placed {new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</small>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span className={`order-status-badge ${statusClass(order.orderStatus)}`}>
                      {order.orderStatus}
                    </span>
                    <span className="order-status-badge status-badge-pending">
                      {order.paymentStatus}
                    </span>
                  </div>
                </div>

                <div className="customer-order-card-meta">
                  <div>
                    <span>Subtotal</span>
                    <strong>{currency(order.subtotalPaise)}</strong>
                  </div>
                  <div>
                    <span>Delivery</span>
                    <strong>{order.deliveryFeePaise ? currency(order.deliveryFeePaise) : "Free"}</strong>
                  </div>
                  <div>
                    <span>Total</span>
                    <strong style={{ color: "var(--ink)" }}>{currency(order.totalPaise)}</strong>
                  </div>
                  <div>
                    <span>Payment Status</span>
                    <strong>{order.paymentStatus === "UNPAID" ? "Awaiting Payment" : order.paymentStatus}</strong>
                  </div>
                </div>

                <div className="customer-order-card-foot">
                  <span style={{ fontSize: "12px", color: "var(--muted)", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    <Clock size={14} /> Created server-side
                  </span>
                  <Link href={`/orders/${order.id}`} className="button button-quiet">
                    <FileText size={14} /> View order details <ArrowRight size={14} />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
