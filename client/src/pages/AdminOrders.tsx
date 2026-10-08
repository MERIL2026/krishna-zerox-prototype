import { ArrowLeft, ChevronRight, FileText, LockKeyhole, RefreshCw, Search, ShieldAlert, User } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import type { Order } from "../../../drizzle/schema";

const currency = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;

const ORDER_STATUSES: Array<Order["orderStatus"]> = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
];

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

export default function AdminOrders() {
  const { user, loading } = useAuth();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const list = trpc.orders.adminList.useQuery(undefined, {
    enabled: Boolean(user && ["owner", "admin", "staff"].includes(user.role)),
    retry: false,
  });

  const detail = trpc.orders.adminGet.useQuery(
    { orderId: selectedId ?? 0 },
    { enabled: selectedId !== null, retry: false }
  );

  const updateStatusMutation = trpc.orders.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Order status updated");
      void list.refetch();
      void detail.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update order status");
    },
  });

  const canEditOrders = Boolean(user && ["owner", "admin"].includes(user.role));

  const filteredOrders = useMemo(() => {
    if (!list.data) return [];
    return list.data.filter((order) => {
      const matchesSearch =
        !searchTerm.trim() ||
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase().trim()) ||
        String(order.customerId).includes(searchTerm.trim());
      const matchesStatus = statusFilter === "ALL" || order.orderStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [list.data, searchTerm, statusFilter]);

  if (loading) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-card">
          <LockKeyhole size={22} />
          <h1>Checking access…</h1>
          <p>Verifying operations permissions.</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-card">
          <LockKeyhole size={22} />
          <h1>Operations sign-in</h1>
          <p>Sign in with your authorized Paperlane account to view orders.</p>
          <button className="admin-primary" onClick={() => startLogin()}>
            Sign in to continue
          </button>
        </div>
      </div>
    );
  }

  if (!["owner", "admin", "staff"].includes(user.role)) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-card">
          <ShieldAlert size={22} />
          <h1>Access restricted</h1>
          <p>Your account does not have orders permission.</p>
          <Link href="/" className="admin-primary">
            Back to shop
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span>PL</span>
          <b>paperlane</b>
        </div>
        <div className="admin-context">Operations workspace</div>
        <nav>
          <a href="/admin">
            <span>⌂</span> Dashboard
          </a>
          <a className="active" href="/admin/orders">
            <span>◌</span> Orders {list.data && <b>{list.data.length}</b>}
          </a>
          <a href="/admin/products">
            <span>□</span> Products
          </a>
          <a href="/admin/categories">
            <span>◫</span> Categories
          </a>
          <a href="/admin">
            <span>▣</span> Print queue
          </a>
        </nav>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-overline">OPERATIONS · ORDERS</span>
            <h1>Orders management.</h1>
          </div>
          <Link href="/admin" className="admin-primary">
            <ArrowLeft size={15} /> Dashboard
          </Link>
        </header>

        <div className="admin-content">
          <div className="admin-toolbar">
            <div>
              <h2>Customer orders</h2>
              <p>Server-authoritative orders with snapshot pricing and payment status tracking.</p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #cbd5e1", borderRadius: "6px", padding: "8px 12px", background: "#fff" }}>
                <Search size={15} color="#94a3b8" />
                <input
                  type="text"
                  placeholder="Search order # or customer ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ border: 0, outline: 0, fontSize: "12px", width: "190px" }}
                />
              </label>
              <button
                className="select-button"
                onClick={() => void list.refetch()}
                title="Refresh order list"
              >
                <RefreshCw size={13} /> Refresh
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
            {["ALL", "PENDING", "CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "COMPLETED", "CANCELLED"].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: "6px 12px",
                  fontSize: "11px",
                  fontWeight: 700,
                  borderRadius: "20px",
                  border: "1px solid",
                  borderColor: statusFilter === status ? "#2563eb" : "#e2e8f0",
                  background: statusFilter === status ? "#eff6ff" : "#fff",
                  color: statusFilter === status ? "#2563eb" : "#64748b",
                  cursor: "pointer",
                }}
              >
                {status.replaceAll("_", " ")}
              </button>
            ))}
          </div>

          {list.isLoading && <div className="admin-panel">Loading orders…</div>}
          {list.isError && <div className="admin-panel">Orders are unavailable for this account.</div>}

          {list.data && (
            <div className="admin-panel">
              <div className="queue-table">
                {filteredOrders.length === 0 ? (
                  <div className="empty-admin">
                    {searchTerm || statusFilter !== "ALL"
                      ? "No orders match the current search/filter."
                      : "No orders yet. Verified checkout orders will appear here."}
                  </div>
                ) : (
                  filteredOrders.map((order) => (
                    <button
                      className="queue-row admin-order-row"
                      key={order.id}
                      onClick={() => setSelectedId(order.id)}
                      style={{
                        background: selectedId === order.id ? "#edf4ff" : "transparent",
                        gridTemplateColumns: "1.2fr 1fr 1fr 1fr 1fr 30px",
                      }}
                    >
                      <span className="queue-id" style={{ fontWeight: 800 }}>{order.orderNumber}</span>
                      <span style={{ fontSize: "11px", color: "#64748b" }}>
                        Customer #{order.customerId}
                      </span>
                      <span className="queue-file">
                        <FileText size={14} /> {order.fulfillmentType.replaceAll("_", " ")}
                      </span>
                      <span className={`order-status-badge ${statusClass(order.orderStatus)}`}>
                        {order.orderStatus}
                      </span>
                      <span style={{ fontWeight: 800 }}>{currency(order.totalPaise)}</span>
                      <ChevronRight size={15} />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {detail.data && (
            <section className="admin-panel order-detail-panel">
              <div className="panel-head">
                <div>
                  <h3>Order details: {detail.data.order.orderNumber}</h3>
                  <p>
                    Placed on {new Date(detail.data.order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <button className="panel-link" onClick={() => setSelectedId(null)}>
                  Close details
                </button>
              </div>

              <div className="order-detail-grid">
                <div>
                  <span className="admin-overline">TOTAL AMOUNT</span>
                  <strong>{currency(detail.data.order.totalPaise)}</strong>
                </div>
                <div>
                  <span className="admin-overline">PAYMENT STATUS</span>
                  <span className="order-status-badge status-badge-pending" style={{ marginTop: "4px" }}>
                    {detail.data.order.paymentStatus}
                  </span>
                </div>
                <div>
                  <span className="admin-overline">FULFILMENT</span>
                  <strong>{detail.data.order.fulfillmentType.replaceAll("_", " ")}</strong>
                </div>
                <div>
                  <span className="admin-overline">CUSTOMER</span>
                  <strong style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <User size={14} /> Account #{detail.data.order.customerId}
                  </strong>
                </div>
              </div>

              {detail.data.order.deliveryAddress && (
                <div style={{ padding: "12px 0", borderBottom: "1px solid #edf0f3", fontSize: "12px" }}>
                  <span className="admin-overline">DELIVERY ADDRESS</span>
                  <p style={{ margin: "4px 0 0", color: "#334155" }}>{detail.data.order.deliveryAddress}</p>
                </div>
              )}

              {canEditOrders && (
                <div className="status-update-row">
                  <span style={{ fontSize: "12px", fontWeight: 700 }}>Update Status:</span>
                  <select
                    value={detail.data.order.orderStatus}
                    disabled={updateStatusMutation.isPending}
                    onChange={(e) => {
                      const nextStatus = e.target.value as Order["orderStatus"];
                      updateStatusMutation.mutate({
                        orderId: detail.data.order.id,
                        status: nextStatus,
                      });
                    }}
                  >
                    {ORDER_STATUSES.map((st) => (
                      <option key={st} value={st}>
                        {st.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  {updateStatusMutation.isPending && (
                    <span style={{ fontSize: "11px", color: "#64748b" }}>Saving…</span>
                  )}
                </div>
              )}

              <div style={{ marginTop: "16px" }}>
                <span className="admin-overline">PURCHASED LINE ITEMS (SNAPSHOT)</span>
                <div className="order-items-table">
                  <div className="order-item-row head">
                    <span>Product</span>
                    <span>Unit Price</span>
                    <span>Quantity</span>
                    <span>Subtotal</span>
                  </div>
                  {detail.data.items.map((item) => (
                    <div className="order-item-row" key={item.id}>
                      <div>
                        <strong>{item.productNameSnapshot}</strong>
                        {item.skuSnapshot && (
                          <small style={{ display: "block", color: "#94a3b8" }}>
                            {item.skuSnapshot}
                          </small>
                        )}
                      </div>
                      <span>{currency(item.unitPricePaise)}</span>
                      <span>{item.quantity}</span>
                      <strong style={{ fontWeight: 800 }}>{currency(item.subtotalPaise)}</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: "18px" }}>
                <span className="admin-overline">STATUS HISTORY LOG</span>
                <div className="queue-table">
                  {detail.data.history.map((event) => (
                    <div className="queue-row" key={event.id}>
                      <span style={{ color: "#64748b" }}>{event.oldStatus || "CREATED"}</span>
                      <span className="queue-status blue" style={{ fontWeight: 800 }}>
                        → {event.newStatus}
                      </span>
                      <span>User #{event.changedBy ?? "System"}</span>
                      <small>{new Date(event.createdAt).toLocaleDateString("en-IN", { hour: "2-digit", minute: "2-digit" })}</small>
                      <span />
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
    </div>
  );
}
