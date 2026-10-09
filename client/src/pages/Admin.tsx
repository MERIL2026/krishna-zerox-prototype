import { useState, useEffect, useMemo } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Box,
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Filter,
  Layers,
  LockKeyhole,
  Package,
  Printer,
  RefreshCw,
  RotateCcw,
  Search,
  Settings2,
  Sparkles,
  Tag,
  User,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import AdminInventory from "@/components/AdminInventory";
import AdminGate from "@/components/AdminGate";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  getPrintOrders,
  updatePrintOrderStatus,
  deletePrintOrder,
  INITIAL_DEMO_ORDERS,
  PRINT_ORDERS_STORAGE_KEY,
  type PrintOrder,
  type OrderStatus,
  formatFileSize,
} from "@/data/printOrders";

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  NEW: {
    label: "New",
    bg: "#f3e8ff",
    text: "#7e22ce",
    border: "#d8b4fe",
    dot: "#a855f7",
  },
  ACCEPTED: {
    label: "Accepted",
    bg: "#eff6ff",
    text: "#1d4ed8",
    border: "#bfdbfe",
    dot: "#3b82f6",
  },
  IN_PROGRESS: {
    label: "In Progress",
    bg: "#fef3c7",
    text: "#b45309",
    border: "#fde68a",
    dot: "#f59e0b",
  },
  READY: {
    label: "Ready",
    bg: "#dcfce7",
    text: "#15803d",
    border: "#bbf7d0",
    dot: "#22c55e",
  },
  COMPLETED: {
    label: "Completed",
    bg: "#f1f5f9",
    text: "#475569",
    border: "#e2e8f0",
    dot: "#94a3b8",
  },
};

const ORDER_STATUS_LIST: OrderStatus[] = [
  "NEW",
  "ACCEPTED",
  "IN_PROGRESS",
  "READY",
  "COMPLETED",
];

function formatTimeAgo(isoString: string): string {
  try {
    const diffMs = Date.now() - new Date(isoString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Just now";
    if (diffMins === 1) return "1 min ago";
    if (diffMins < 60) return `${diffMins} min ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return "1 hr ago";
    if (diffHours < 24) return `${diffHours} hrs ago`;
    return new Date(isoString).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return "Recent";
  }
}

export default function Admin() {
  const { user, loading, logout } = useAuth();
  const [printOrders, setPrintOrders] = useState<PrintOrder[]>(() => getPrintOrders());
  const [selectedOrder, setSelectedOrder] = useState<PrintOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | OrderStatus>("ALL");

  const isOperationsUser = Boolean(
    user && ["owner", "admin", "staff"].includes(user.role)
  );

  useEffect(() => {
    const reloadOrders = () => {
      setPrintOrders(getPrintOrders());
    };

    window.addEventListener("krishna-print-orders-updated", reloadOrders);
    window.addEventListener("storage", reloadOrders);

    return () => {
      window.removeEventListener("krishna-print-orders-updated", reloadOrders);
      window.removeEventListener("storage", reloadOrders);
    };
  }, []);

  // Sync selectedOrder if it was updated
  useEffect(() => {
    if (selectedOrder) {
      const refreshed = printOrders.find((o) => o.id === selectedOrder.id);
      if (refreshed) setSelectedOrder(refreshed);
    }
  }, [printOrders, selectedOrder]);

  if (loading || !user || !isOperationsUser) {
    return <AdminGate loading={loading} user={user} onLogout={logout} />;
  }

  const displayName = user.name || "Meril Patel";
  const firstName = displayName.split(" ")[0] || "Meril";
  const roleLabel = user.role.charAt(0).toUpperCase() + user.role.slice(1);
  const initials =
    displayName
      .split(" ")
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "MP";

  const handleStatusChange = (orderId: string, nextStatus: OrderStatus) => {
    updatePrintOrderStatus(orderId, nextStatus);
    toast.success(`Order ${orderId} marked as ${STATUS_CONFIG[nextStatus].label}`);
  };

  const handleResetDemoOrders = () => {
    localStorage.setItem(
      PRINT_ORDERS_STORAGE_KEY,
      JSON.stringify(INITIAL_DEMO_ORDERS)
    );
    setPrintOrders(INITIAL_DEMO_ORDERS);
    toast.success("Print queue reset to initial prototype state");
  };

  const filteredOrders = printOrders.filter((order) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      order.id.toLowerCase().includes(q) ||
      order.customer.name.toLowerCase().includes(q) ||
      order.customer.phone.includes(q) ||
      order.document.name.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "ALL" || order.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const activeQueueCount = printOrders.filter(
    (o) => o.status !== "COMPLETED"
  ).length;

  return (
    <div className="admin-page">
      <aside className="admin-sidebar">
        <div className="admin-logo">
          <span>KX</span>
          <b>krishna xerox</b>
        </div>
        <div className="admin-context">Operations workspace</div>
        <nav>
          <a className="active" href="/admin">
            <span>⌂</span> Dashboard
          </a>
          <a href="/admin/orders">
            <span>◌</span> Orders
          </a>
          <a href="/admin/products">
            <span>□</span> Products
          </a>
          <a href="/admin/categories">
            <span>◫</span> Categories
          </a>
          <a href="#print-queue">
            <span>▣</span> Print queue <b>{activeQueueCount}</b>
          </a>
          <a>
            <span>○</span> Customers
          </a>
          <a>
            <span>◈</span> Analytics
          </a>
        </nav>
        <div className="admin-side-bottom">
          <a>
            <Settings2 size={16} /> Settings
          </a>
          <div
            className="admin-user"
            onClick={() => void logout()}
            title="Click to sign out"
            style={{ cursor: "pointer" }}
          >
            <span>{initials}</span>
            <div>
              <b>{displayName}</b>
              <small>{roleLabel} (Sign out)</small>
            </div>
            <ChevronRight size={15} />
          </div>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-overline">LIVE OPERATIONS CONSOLE</span>
            <h1>Good day, {firstName}.</h1>
          </div>
          <div className="admin-top-actions">
            <label>
              <Search size={16} />
              <input
                placeholder="Search anything"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </label>
            <button
              className="admin-avatar"
              onClick={() => void logout()}
              title="Click to sign out"
            >
              {initials}
            </button>
          </div>
        </header>

        <div className="admin-content">
          <AdminInventory />

          <div className="admin-toolbar">
            <div>
              <h2>Overview</h2>
              <p>What’s happening across the shop floor today.</p>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="select-button"
                onClick={handleResetDemoOrders}
                title="Reset demo orders to initial mock values"
              >
                <RotateCcw size={13} /> Reset Demo Queue
              </button>
              <button
                className="admin-primary"
                onClick={() => toast.success("Operations summary downloaded")}
              >
                Download report <ArrowDownRight size={15} />
              </button>
            </div>
          </div>

          <div className="stats-grid">
            <StatCard
              label="Today's sales"
              value="₹24,680"
              delta="18.4%"
              positive
              icon={<CircleDollarSign size={18} />}
            />
            <StatCard
              label="Print queue (Prototype)"
              value={String(printOrders.length)}
              delta={`${activeQueueCount} active jobs`}
              positive
              icon={<Printer size={18} />}
            />
            <StatCard
              label="E-commerce orders"
              value="64"
              delta="8.6%"
              positive
              icon={<Package size={18} />}
            />
            <StatCard
              label="Paper stock"
              value="100% OK"
              delta="A4 75/100/220 GSM"
              icon={<Box size={18} />}
            />
          </div>

          <div className="admin-panels">
            {/* Sales Chart Panel */}
            <section className="admin-panel chart-panel">
              <div className="panel-head">
                <div>
                  <h3>Sales overview</h3>
                  <p>Last 7 days · all channels</p>
                </div>
                <button className="select-button">
                  This week <ChevronRight size={14} />
                </button>
              </div>
              <div className="chart-figure">
                <div className="chart-y">
                  <span>30k</span>
                  <span>20k</span>
                  <span>10k</span>
                  <span>0</span>
                </div>
                <div className="chart-body">
                  <div className="chart-grid-lines">
                    <i />
                    <i />
                    <i />
                    <i />
                  </div>
                  <svg
                    viewBox="0 0 680 230"
                    preserveAspectRatio="none"
                    aria-label="Sales line chart"
                  >
                    <defs>
                      <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#dbeafe" stopOpacity="0.85" />
                        <stop offset="100%" stopColor="#dbeafe" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,190 C55,180 62,125 116,142 S170,115 226,128 S282,70 338,99 S398,68 452,83 S520,28 568,55 S632,20 680,34 L680,230 L0,230 Z"
                      fill="url(#fill)"
                    />
                    <path
                      d="M0,190 C55,180 62,125 116,142 S170,115 226,128 S282,70 338,99 S398,68 452,83 S520,28 568,55 S632,20 680,34"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="3"
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="chart-x">
                    <span>01 Oct</span>
                    <span>02 Oct</span>
                    <span>03 Oct</span>
                    <span>04 Oct</span>
                    <span>05 Oct</span>
                    <span>06 Oct</span>
                    <span>07 Oct</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Shop Floor Printers Panel */}
            <section className="admin-panel printers-panel">
              <div className="panel-head">
                <div>
                  <h3>Printer status</h3>
                  <p>Live from the shop floor</p>
                </div>
                <button className="more-button">•••</button>
              </div>
              <div className="printer-list">
                <PrinterRow
                  name="Printer 01"
                  detail="Canon imageRUNNER · A4 BW/Colour"
                  status="Available"
                  tone="green"
                />
                <PrinterRow
                  name="Printer 02"
                  detail="Epson SureColor · A3/Cardstock"
                  status="Printing"
                  tone="blue"
                />
                <PrinterRow
                  name="Printer 03"
                  detail="HP LaserJet Pro · High Speed Duplex"
                  status="Available"
                  tone="green"
                />
              </div>
              <button
                className="panel-link"
                onClick={() => toast("All 3 shop floor printers calibrated")}
              >
                Printer diagnostics <ChevronRight size={15} />
              </button>
            </section>
          </div>

          {/* TASK 4: ADMIN PRINT QUEUE */}
          <div className="admin-panels bottom-panels" id="print-queue">
            <section
              className="admin-panel queue-panel"
              style={{ gridColumn: "1 / -1", padding: "20px" }}
            >
              <div
                className="panel-head"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800 }}>
                      Smart Xerox Print Queue
                    </h3>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: "#fef3c7",
                        color: "#92400e",
                        border: "1px solid #fde68a",
                        letterSpacing: "0.04em",
                      }}
                    >
                      PROTOTYPE DEMO STATE
                    </span>
                  </div>
                  <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "12px" }}>
                    Connected live via localStorage state · Authorized status management
                    for {displayName} ({roleLabel})
                  </p>
                </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    flexWrap: "wrap",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#fff",
                      border: "1px solid #cbd5e1",
                      borderRadius: "6px",
                      padding: "6px 10px",
                      fontSize: "12px",
                    }}
                  >
                    <Search size={14} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder="Search ID, customer, file…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{
                        border: "none",
                        outline: "none",
                        fontSize: "12px",
                        width: "160px",
                      }}
                    />
                  </label>
                  <button
                    className="select-button"
                    onClick={() => {
                      setPrintOrders(getPrintOrders());
                      toast.success("Print queue refreshed");
                    }}
                    title="Refresh orders from storage"
                  >
                    <RefreshCw size={13} /> Refresh
                  </button>
                </div>
              </div>

              {/* Status Filter Tabs */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  margin: "16px 0 12px",
                  flexWrap: "wrap",
                  borderBottom: "1px solid #e2e8f0",
                  paddingBottom: "10px",
                }}
              >
                <button
                  onClick={() => setStatusFilter("ALL")}
                  style={{
                    padding: "4px 12px",
                    fontSize: "11px",
                    fontWeight: 700,
                    borderRadius: "16px",
                    border: "1px solid",
                    borderColor: statusFilter === "ALL" ? "#2563eb" : "#e2e8f0",
                    background: statusFilter === "ALL" ? "#eff6ff" : "#fff",
                    color: statusFilter === "ALL" ? "#2563eb" : "#64748b",
                    cursor: "pointer",
                  }}
                >
                  All Orders ({printOrders.length})
                </button>
                {ORDER_STATUS_LIST.map((st) => {
                  const count = printOrders.filter((o) => o.status === st).length;
                  const cfg = STATUS_CONFIG[st];
                  const active = statusFilter === st;
                  return (
                    <button
                      key={st}
                      onClick={() => setStatusFilter(st)}
                      style={{
                        padding: "4px 10px",
                        fontSize: "11px",
                        fontWeight: 700,
                        borderRadius: "16px",
                        border: `1px solid ${active ? cfg.dot : "#e2e8f0"}`,
                        background: active ? cfg.bg : "#fff",
                        color: active ? cfg.text : "#64748b",
                        cursor: "pointer",
                      }}
                    >
                      {cfg.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Order Rows Table */}
              <div style={{ marginTop: "12px" }}>
                {filteredOrders.length === 0 ? (
                  <div
                    style={{
                      padding: "40px 20px",
                      textAlign: "center",
                      color: "#64748b",
                      fontSize: "13px",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px dashed #cbd5e1",
                    }}
                  >
                    <Printer size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                    <p style={{ margin: 0, fontWeight: 700 }}>No print orders found</p>
                    <p style={{ margin: "4px 0 12px", fontSize: "12px" }}>
                      {searchQuery
                        ? "Try clearing your search query"
                        : "Use the storefront 'Print now' button to place a test print order"}
                    </p>
                    <button
                      className="select-button"
                      onClick={handleResetDemoOrders}
                      style={{ margin: "0 auto" }}
                    >
                      <RotateCcw size={13} /> Load Sample Orders
                    </button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {filteredOrders.map((order) => {
                      const cfg = STATUS_CONFIG[order.status];
                      return (
                        <div
                          key={order.id}
                          style={{
                            display: "grid",
                            gridTemplateColumns: "130px 1.5fr 1.8fr 90px 100px 140px 40px",
                            gap: "12px",
                            alignItems: "center",
                            padding: "12px 14px",
                            borderRadius: "8px",
                            border: "1px solid #e2e8f0",
                            background:
                              selectedOrder?.id === order.id ? "#f0fdf4" : "#ffffff",
                            transition: "all 0.15s ease",
                            fontSize: "12px",
                          }}
                        >
                          {/* 1. Order ID & Prototype badge */}
                          <div>
                            <div
                              style={{
                                fontFamily: "monospace",
                                fontWeight: 800,
                                fontSize: "12px",
                                color: "#0f172a",
                              }}
                            >
                              {order.id}
                            </div>
                            <small
                              style={{
                                display: "inline-block",
                                fontSize: "9px",
                                fontWeight: 700,
                                color: "#d97706",
                                letterSpacing: "0.03em",
                              }}
                            >
                              DEMO ORDER
                            </small>
                          </div>

                          {/* 2. Customer details */}
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#1e293b",
                                display: "flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              <User size={12} color="#64748b" /> {order.customer.name}
                            </div>
                            <div style={{ fontSize: "11px", color: "#64748b" }}>
                              {order.customer.phone} ·{" "}
                              {order.customer.fulfillment === "LOCAL_DELIVERY"
                                ? "Delivery"
                                : "Pickup"}
                            </div>
                          </div>

                          {/* 3. Document & Settings */}
                          <div>
                            <div
                              style={{
                                fontWeight: 700,
                                color: "#0f172a",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <FileText size={14} color="#3b82f6" />
                              <span
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  maxWidth: "200px",
                                }}
                                title={order.document.name}
                              >
                                {order.document.name}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "11px",
                                color: "#64748b",
                                marginTop: "2px",
                              }}
                            >
                              {order.config.paperSize} ·{" "}
                              {order.config.colorMode === "COLOR" ? "Colour" : "B&W"} ·{" "}
                              {order.config.sides === "DOUBLE" ? "2-Sided" : "1-Sided"} ·{" "}
                              {order.document.pageCount} pp · {order.config.copies}{" "}
                              {order.config.copies === 1 ? "copy" : "copies"}
                              {order.config.binding !== "NONE" &&
                                ` · ${order.config.binding.replace("_", " ")}`}
                              {order.config.lamination !== "NONE" &&
                                ` · ${order.config.lamination} Lam`}
                            </div>
                          </div>

                          {/* 4. Price */}
                          <div>
                            <strong
                              style={{
                                fontSize: "13px",
                                fontWeight: 800,
                                color: "#0f172a",
                              }}
                            >
                              ₹{order.pricing.totalAmount}
                            </strong>
                            <div style={{ fontSize: "10px", color: "#94a3b8" }}>
                              est. total
                            </div>
                          </div>

                          {/* 5. Timestamp */}
                          <div style={{ fontSize: "11px", color: "#64748b" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              <Clock size={11} /> {formatTimeAgo(order.createdAt)}
                            </div>
                          </div>

                          {/* 6. Authorized Status Dropdown */}
                          <div>
                            <select
                              value={order.status}
                              onChange={(e) =>
                                handleStatusChange(
                                  order.id,
                                  e.target.value as OrderStatus
                                )
                              }
                              style={{
                                width: "100%",
                                padding: "4px 8px",
                                fontSize: "11px",
                                fontWeight: 700,
                                borderRadius: "6px",
                                border: `1px solid ${cfg.border}`,
                                background: cfg.bg,
                                color: cfg.text,
                                cursor: "pointer",
                              }}
                            >
                              {ORDER_STATUS_LIST.map((st) => (
                                <option key={st} value={st}>
                                  {STATUS_CONFIG[st].label}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* 7. View Details Button */}
                          <div>
                            <button
                              onClick={() => setSelectedOrder(order)}
                              title="Inspect order details"
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                padding: "4px",
                                borderRadius: "4px",
                                color: "#64748b",
                              }}
                            >
                              <Eye size={16} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* INSPECTION MODAL FOR SELECTED ORDER */}
          {selectedOrder && (
            <div
              className="overlay modal-centered"
              role="dialog"
              aria-modal="true"
              style={{
                position: "fixed",
                inset: 0,
                zIndex: 9999,
                background: "rgba(15, 23, 42, 0.65)",
                backdropFilter: "blur(4px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px",
              }}
            >
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  width: "100%",
                  maxWidth: "580px",
                  maxHeight: "90vh",
                  overflowY: "auto",
                  padding: "24px",
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                  border: "2px solid #0f172a",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    borderBottom: "1px solid #e2e8f0",
                    paddingBottom: "14px",
                  }}
                >
                  <div>
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 800,
                        background: "#fef3c7",
                        color: "#92400e",
                        padding: "2px 8px",
                        borderRadius: "10px",
                      }}
                    >
                      PROTOTYPE DEMO ORDER
                    </span>
                    <h2
                      style={{
                        margin: "6px 0 0",
                        fontSize: "20px",
                        fontFamily: "monospace",
                        fontWeight: 800,
                      }}
                    >
                      {selectedOrder.id}
                    </h2>
                    <small style={{ color: "#64748b" }}>
                      Created at {new Date(selectedOrder.createdAt).toLocaleString("en-IN")}
                    </small>
                  </div>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px",
                    }}
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Status Switcher Toolbar */}
                <div
                  style={{
                    margin: "18px 0",
                    padding: "14px",
                    background: "#f8fafc",
                    borderRadius: "10px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <label
                    style={{
                      display: "block",
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#475569",
                      marginBottom: "8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Change Order Status (Admin Authorized)
                  </label>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                    {ORDER_STATUS_LIST.map((st) => {
                      const cfg = STATUS_CONFIG[st];
                      const active = selectedOrder.status === st;
                      return (
                        <button
                          key={st}
                          onClick={() => handleStatusChange(selectedOrder.id, st)}
                          style={{
                            padding: "6px 12px",
                            fontSize: "11px",
                            fontWeight: 800,
                            borderRadius: "6px",
                            border: `1px solid ${active ? cfg.dot : "#cbd5e1"}`,
                            background: active ? cfg.bg : "#ffffff",
                            color: active ? cfg.text : "#475569",
                            cursor: "pointer",
                          }}
                        >
                          {active && "✓ "}
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Details Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: "14px",
                    fontSize: "12px",
                    marginBottom: "16px",
                  }}
                >
                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "12px",
                      borderRadius: "8px",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: "10px",
                        color: "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      Customer Info
                    </strong>
                    <div style={{ marginTop: "4px", fontWeight: 700, fontSize: "13px" }}>
                      {selectedOrder.customer.name}
                    </div>
                    <div style={{ color: "#475569" }}>
                      Phone: {selectedOrder.customer.phone}
                    </div>
                    {selectedOrder.customer.email && (
                      <div style={{ color: "#64748b" }}>
                        {selectedOrder.customer.email}
                      </div>
                    )}
                    <div style={{ marginTop: "4px", fontWeight: 600 }}>
                      {selectedOrder.customer.fulfillment === "LOCAL_DELIVERY"
                        ? "🚚 Campus Delivery"
                        : "🏬 Store Pickup (12 Paper Street)"}
                    </div>
                    {selectedOrder.customer.deliveryAddress && (
                      <div style={{ color: "#64748b", marginTop: "2px" }}>
                        Address: {selectedOrder.customer.deliveryAddress}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      background: "#f8fafc",
                      padding: "12px",
                      borderRadius: "8px",
                    }}
                  >
                    <strong
                      style={{
                        display: "block",
                        fontSize: "10px",
                        color: "#64748b",
                        textTransform: "uppercase",
                      }}
                    >
                      File Specs
                    </strong>
                    <div
                      style={{
                        marginTop: "4px",
                        fontWeight: 700,
                        fontSize: "13px",
                        wordBreak: "break-all",
                      }}
                    >
                      {selectedOrder.document.name}
                    </div>
                    <div style={{ color: "#475569" }}>
                      Size: {formatFileSize(selectedOrder.document.sizeBytes)}
                    </div>
                    <div style={{ color: "#475569" }}>
                      Page count: {selectedOrder.document.pageCount} pages
                    </div>
                    <div style={{ color: "#475569" }}>
                      Print copies: {selectedOrder.config.copies}
                    </div>
                  </div>
                </div>

                {/* Print Configuration Details */}
                <div
                  style={{
                    background: "#f1f5f9",
                    padding: "12px",
                    borderRadius: "8px",
                    marginBottom: "16px",
                    fontSize: "12px",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: "10px",
                      color: "#64748b",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Print Specifications
                  </strong>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "6px",
                      color: "#1e293b",
                    }}
                  >
                    <div>
                      Paper Size: <b>{selectedOrder.config.paperSize}</b>
                    </div>
                    <div>
                      Colour Mode:{" "}
                      <b>
                        {selectedOrder.config.colorMode === "COLOR"
                          ? "Full Colour"
                          : "Black & White"}
                      </b>
                    </div>
                    <div>
                      Paper Weight:{" "}
                      <b>{selectedOrder.config.paperGsm.replace("_", " ")}</b>
                    </div>
                    <div>
                      Sides:{" "}
                      <b>
                        {selectedOrder.config.sides === "DOUBLE"
                          ? "Double-Sided (Duplex)"
                          : "Single-Sided"}
                      </b>
                    </div>
                    <div>
                      Binding:{" "}
                      <b>{selectedOrder.config.binding.replace("_", " ")}</b>
                    </div>
                    <div>
                      Lamination: <b>{selectedOrder.config.lamination}</b>
                    </div>
                  </div>
                  {selectedOrder.customer.notes && (
                    <div
                      style={{
                        marginTop: "8px",
                        paddingTop: "6px",
                        borderTop: "1px dashed #cbd5e1",
                        color: "#b45309",
                      }}
                    >
                      <b>Customer Note:</b> {selectedOrder.customer.notes}
                    </div>
                  )}
                </div>

                {/* Price Breakdown */}
                <div
                  style={{
                    background: "#fffbeb",
                    padding: "12px",
                    borderRadius: "8px",
                    border: "1px solid #fde68a",
                    fontSize: "12px",
                  }}
                >
                  <strong
                    style={{
                      display: "block",
                      fontSize: "10px",
                      color: "#92400e",
                      textTransform: "uppercase",
                      marginBottom: "6px",
                    }}
                  >
                    Pricing Breakdown (Transparent INR Prototype)
                  </strong>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>
                      Base Print ({selectedOrder.pricing.ratePerPage} ×{" "}
                      {selectedOrder.document.pageCount} pp ×{" "}
                      {selectedOrder.config.copies}):
                    </span>
                    <b>₹{selectedOrder.pricing.printCost}</b>
                  </div>
                  {selectedOrder.pricing.paperSurcharge > 0 && (
                    <div
                      style={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <span>GSM Surcharge:</span>
                      <b>₹{selectedOrder.pricing.paperSurcharge}</b>
                    </div>
                  )}
                  {selectedOrder.pricing.bindingCost > 0 && (
                    <div
                      style={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <span>Binding ({selectedOrder.config.binding}):</span>
                      <b>₹{selectedOrder.pricing.bindingCost}</b>
                    </div>
                  )}
                  {selectedOrder.pricing.laminationCost > 0 && (
                    <div
                      style={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <span>Lamination ({selectedOrder.config.lamination}):</span>
                      <b>₹{selectedOrder.pricing.laminationCost}</b>
                    </div>
                  )}
                  {selectedOrder.pricing.deliveryFee > 0 && (
                    <div
                      style={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <span>Fulfillment Fee:</span>
                      <b>₹{selectedOrder.pricing.deliveryFee}</b>
                    </div>
                  )}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      borderTop: "1px solid #fde68a",
                      marginTop: "6px",
                      paddingTop: "6px",
                      fontSize: "14px",
                      fontWeight: 800,
                      color: "#92400e",
                    }}
                  >
                    <span>Total Estimate:</span>
                    <span>₹{selectedOrder.pricing.totalAmount}</span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "16px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <button
                    onClick={() => {
                      if (confirm("Remove this prototype order?")) {
                        deletePrintOrder(selectedOrder.id);
                        setSelectedOrder(null);
                        toast.success("Order removed from queue");
                      }
                    }}
                    style={{
                      padding: "8px 12px",
                      borderRadius: "6px",
                      background: "#fee2e2",
                      color: "#dc2626",
                      border: "none",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Delete from Queue
                  </button>
                  <button
                    onClick={() => setSelectedOrder(null)}
                    className="button button-dark"
                    style={{ padding: "8px 18px", fontSize: "12px" }}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  delta,
  positive,
  icon,
  warning,
}: {
  label: string;
  value: string;
  delta: string;
  positive?: boolean;
  icon: React.ReactNode;
  warning?: boolean;
}) {
  return (
    <div className={`stat-card ${warning ? "warning-card" : ""}`}>
      <div className="stat-card-top">
        <span>{icon}</span>
        <small>{label}</small>
      </div>
      <strong>{value}</strong>
      <div className={`stat-delta ${positive ? "positive" : ""}`}>
        {positive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}{" "}
        {delta}
      </div>
    </div>
  );
}

function PrinterRow({
  name,
  detail,
  status,
  tone,
}: {
  name: string;
  detail: string;
  status: string;
  tone: string;
}) {
  return (
    <div className="printer-row">
      <span className={`printer-dot ${tone}`} />
      <div>
        <b>{name}</b>
        <small>{detail}</small>
      </div>
      <span className={`printer-status ${tone}`}>{status}</span>
    </div>
  );
}
