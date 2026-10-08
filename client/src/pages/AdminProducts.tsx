import { useState, useMemo } from "react";
import {
  AlertCircle,
  Archive,
  ArrowLeft,
  Check,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  Filter,
  Layers,
  LockKeyhole,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

type StockFilter = "ALL" | "IN_STOCK" | "LOW_STOCK" | "OUT_OF_STOCK";

interface ProductFormData {
  name: string;
  sku: string;
  categoryId: number;
  price: number; // in Rupees
  oldPrice?: number; // in Rupees
  stock: number;
  lowStockThreshold: number;
  image: string;
  additionalImages?: string;
  swatch: string;
  shortDescription?: string;
  description?: string;
  badge?: string;
  isPublished: boolean;
  isFeatured: boolean;
  sortOrder: number;
}

export default function AdminProducts() {
  const { user, loading } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<number | undefined>(undefined);
  const [stockFilter, setStockFilter] = useState<StockFilter>("ALL");
  const [publishedFilter, setPublishedFilter] = useState<string>("ALL");
  const [featuredFilter, setFeaturedFilter] = useState<string>("ALL");

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  const isPublishedParam = publishedFilter === "ALL" ? undefined : publishedFilter === "PUBLISHED";
  const isFeaturedParam = featuredFilter === "ALL" ? undefined : featuredFilter === "FEATURED";

  // Queries
  const productsQuery = trpc.catalog.adminList.useQuery(
    {
      search: searchTerm.trim() || undefined,
      categoryId: categoryFilter,
      stockStatus: stockFilter,
      isPublished: isPublishedParam,
      isFeatured: isFeaturedParam,
    },
    { enabled: Boolean(user && ["owner", "admin", "staff"].includes(user.role)) }
  );

  const categoriesQuery = trpc.catalog.adminCategories.useQuery(undefined, {
    enabled: Boolean(user && ["owner", "admin", "staff"].includes(user.role)),
  });

  const canWrite = Boolean(user && ["owner", "admin"].includes(user.role));

  // Mutations
  const createMutation = trpc.catalog.createProduct.useMutation({
    onSuccess: () => {
      toast.success("Product created successfully");
      setIsCreateOpen(false);
      void productsQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create product");
    },
  });

  const updateMutation = trpc.catalog.updateProduct.useMutation({
    onSuccess: () => {
      toast.success("Product updated successfully");
      setEditingProduct(null);
      void productsQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update product");
    },
  });

  const archiveMutation = trpc.catalog.archiveProduct.useMutation({
    onSuccess: (data) => {
      toast.success(data.isPublished ? "Product published" : "Product archived (unpublished)");
      void productsQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const deleteMutation = trpc.catalog.deleteProduct.useMutation({
    onSuccess: (data) => {
      if (data.archived) {
        toast.info(data.message);
      } else {
        toast.success(data.message);
      }
      void productsQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete product");
    },
  });

  const products = productsQuery.data ?? [];
  const categoriesList = categoriesQuery.data ?? [];

  if (loading) {
    return (
      <div className="admin-gate">
        <div className="admin-gate-card">
          <LockKeyhole size={22} />
          <h1>Checking access…</h1>
          <p>Verifying catalog permissions.</p>
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
          <p>Sign in with your authorized account to manage the catalog.</p>
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
          <p>Your account does not have catalog management permissions.</p>
          <Link href="/" className="admin-primary">
            Back to storefront
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Admin Sidebar */}
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
          <a href="/admin/orders">
            <span>◌</span> Orders
          </a>
          <a className="active" href="/admin/products">
            <span>□</span> Products <b>{products.length}</b>
          </a>
          <a href="/admin/categories">
            <span>◫</span> Categories <b>{categoriesList.length}</b>
          </a>
        </nav>
        <div className="admin-side-bottom">
          <Link href="/shop" className="panel-link" style={{ fontSize: "12px", padding: "10px", color: "#64748b" }}>
            View live storefront <ChevronRight size={14} />
          </Link>
          <div className="admin-user">
            <span>{user.name?.slice(0, 2).toUpperCase() || "MP"}</span>
            <div>
              <b>{user.name || "Meril Patel"}</b>
              <small>{user.role}</small>
            </div>
          </div>
        </div>
      </aside>

      {/* Admin Main Content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64748b" }}>
              <Link href="/admin" style={{ color: "#64748b", textDecoration: "none" }}>Dashboard</Link>
              <span>/</span>
              <span>Catalog</span>
            </div>
            <h1>Product Management</h1>
          </div>
          <div className="admin-top-actions">
            {canWrite && (
              <button
                className="admin-primary"
                onClick={() => setIsCreateOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={15} /> Add product
              </button>
            )}
            <button
              className="admin-icon"
              title="Refresh catalog"
              onClick={() => void productsQuery.refetch()}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <div className="admin-content" style={{ padding: "30px 42px" }}>
          {/* Filters Toolbar */}
          <section className="admin-panel" style={{ padding: "18px 24px", marginBottom: "20px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", flex: "1 1 300px" }}>
                <div style={{ position: "relative", minWidth: "240px", flex: "1" }}>
                  <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder="Search by name, SKU, slug..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "8px 12px 8px 32px",
                      fontSize: "12px",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      outline: "none",
                    }}
                  />
                </div>

                <select
                  value={categoryFilter ?? ""}
                  onChange={(e) => setCategoryFilter(e.target.value ? Number(e.target.value) : undefined)}
                  style={{
                    padding: "8px 12px",
                    fontSize: "12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    background: "#ffffff",
                  }}
                >
                  <option value="">All Categories</option>
                  {categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>

                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value as StockFilter)}
                  style={{
                    padding: "8px 12px",
                    fontSize: "12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    background: "#ffffff",
                  }}
                >
                  <option value="ALL">All Stock</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </select>

                <select
                  value={publishedFilter}
                  onChange={(e) => setPublishedFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    fontSize: "12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    background: "#ffffff",
                  }}
                >
                  <option value="ALL">All Visibility</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="UNPUBLISHED">Archived</option>
                </select>

                <select
                  value={featuredFilter}
                  onChange={(e) => setFeaturedFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    fontSize: "12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    background: "#ffffff",
                  }}
                >
                  <option value="ALL">All Highlights</option>
                  <option value="FEATURED">Featured ⭐</option>
                  <option value="STANDARD">Standard</option>
                </select>
              </div>

              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                {products.length} {products.length === 1 ? "product" : "products"}
              </div>
            </div>
          </section>

          {/* Products Table */}
          <section className="admin-panel" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                    <th style={{ padding: "12px 16px" }}>Product</th>
                    <th style={{ padding: "12px 14px" }}>SKU</th>
                    <th style={{ padding: "12px 14px" }}>Category</th>
                    <th style={{ padding: "12px 14px" }}>Price</th>
                    <th style={{ padding: "12px 14px" }}>Stock</th>
                    <th style={{ padding: "12px 14px" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                        {productsQuery.isLoading ? (
                          <span>Loading products...</span>
                        ) : (
                          <span>No products match the selected criteria.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    products.map((p) => {
                      const isLow = p.stockStatus === "LOW_STOCK";
                      const isOut = p.stockStatus === "OUT_OF_STOCK";

                      return (
                        <tr key={p.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              <img
                                src={p.image}
                                alt={p.name}
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  objectFit: "cover",
                                  borderRadius: "6px",
                                  border: "1px solid #e2e8f0",
                                  background: p.swatch || "#fff",
                                }}
                              />
                              <div>
                                <strong style={{ display: "block", color: "#1e293b", fontWeight: 700 }}>
                                  {p.name}
                                  {p.isFeatured && (
                                    <span title="Featured Product" style={{ marginLeft: "6px", color: "#eab308" }}>
                                      ★
                                    </span>
                                  )}
                                </strong>
                                <small style={{ color: "#94a3b8" }}>/{p.slug}</small>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <code
                              style={{
                                padding: "2px 6px",
                                background: "#f1f5f9",
                                borderRadius: "4px",
                                color: "#475569",
                                fontSize: "11px",
                              }}
                            >
                              {p.sku}
                            </code>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                background: "#f8fafc",
                                border: "1px solid #e2e8f0",
                                borderRadius: "12px",
                                fontSize: "11px",
                                color: "#334155",
                              }}
                            >
                              {p.categoryName}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div>
                              <strong style={{ color: "#0f172a" }}>₹{p.price}</strong>
                              {p.oldPrice && (
                                <del style={{ display: "block", color: "#94a3b8", fontSize: "10px" }}>
                                  ₹{p.oldPrice}
                                </del>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <div>
                              <span
                                style={{
                                  fontWeight: 700,
                                  color: isOut ? "#ef4444" : isLow ? "#f59e0b" : "#10b981",
                                }}
                              >
                                {p.stock}
                              </span>
                              {isOut ? (
                                <small style={{ display: "block", color: "#ef4444", fontSize: "10px" }}>
                                  Out of stock
                                </small>
                              ) : isLow ? (
                                <small style={{ display: "block", color: "#f59e0b", fontSize: "10px" }}>
                                  Low stock (≤{p.lowStockThreshold})
                                </small>
                              ) : (
                                <small style={{ display: "block", color: "#94a3b8", fontSize: "10px" }}>
                                  Available
                                </small>
                              )}
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: p.isPublished ? "#ecfdf5" : "#f1f5f9",
                                color: p.isPublished ? "#059669" : "#64748b",
                              }}
                            >
                              {p.isPublished ? "Live" : "Archived"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            {canWrite && (
                              <div style={{ display: "inline-flex", gap: "6px" }}>
                                <button
                                  className="inventory-edit"
                                  title="Edit product"
                                  onClick={() => setEditingProduct(p)}
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  className="inventory-edit"
                                  title={p.isPublished ? "Archive (unpublish)" : "Publish"}
                                  onClick={() => archiveMutation.mutate({ id: p.id, isPublished: !p.isPublished })}
                                >
                                  {p.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                                <button
                                  className="inventory-edit"
                                  title="Delete product (safe delete)"
                                  style={{ color: "#ef4444" }}
                                  onClick={() => {
                                    if (window.confirm(`Delete or archive "${p.name}"? If order history exists, it will be safely archived instead.`)) {
                                      deleteMutation.mutate({ id: p.id });
                                    }
                                  }}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>

      {/* CREATE PRODUCT MODAL */}
      {isCreateOpen && (
        <ProductModal
          title="Create New Product"
          categories={categoriesList}
          onClose={() => setIsCreateOpen(false)}
          onSubmit={(formData) => {
            createMutation.mutate({
              name: formData.name,
              sku: formData.sku,
              categoryId: formData.categoryId,
              pricePaise: Math.round(formData.price * 100),
              oldPricePaise: formData.oldPrice ? Math.round(formData.oldPrice * 100) : undefined,
              stock: formData.stock,
              lowStockThreshold: formData.lowStockThreshold,
              image: formData.image,
              additionalImages: formData.additionalImages ? formData.additionalImages.split(",").map(s => s.trim()).filter(Boolean) : undefined,
              swatch: formData.swatch,
              shortDescription: formData.shortDescription,
              description: formData.description,
              badge: formData.badge,
              isPublished: formData.isPublished,
              isFeatured: formData.isFeatured,
              sortOrder: formData.sortOrder,
            });
          }}
          isLoading={createMutation.isPending}
        />
      )}

      {/* EDIT PRODUCT MODAL */}
      {editingProduct && (
        <ProductModal
          title={`Edit Product: ${editingProduct.name}`}
          initialData={{
            name: editingProduct.name,
            sku: editingProduct.sku,
            categoryId: editingProduct.categoryId,
            price: editingProduct.price,
            oldPrice: editingProduct.oldPrice ?? undefined,
            stock: editingProduct.stock,
            lowStockThreshold: editingProduct.lowStockThreshold,
            image: editingProduct.image,
            additionalImages: editingProduct.additionalImages?.join(", ") || "",
            swatch: editingProduct.swatch || "#FFF8EF",
            shortDescription: editingProduct.shortDescription || "",
            description: editingProduct.description || "",
            badge: editingProduct.badge || "",
            isPublished: editingProduct.isPublished,
            isFeatured: editingProduct.isFeatured,
            sortOrder: editingProduct.sortOrder || 0,
          }}
          categories={categoriesList}
          onClose={() => setEditingProduct(null)}
          onSubmit={(formData) => {
            updateMutation.mutate({
              id: editingProduct.id,
              name: formData.name,
              sku: formData.sku,
              categoryId: formData.categoryId,
              pricePaise: Math.round(formData.price * 100),
              oldPricePaise: formData.oldPrice ? Math.round(formData.oldPrice * 100) : null,
              stock: formData.stock,
              lowStockThreshold: formData.lowStockThreshold,
              image: formData.image,
              additionalImages: formData.additionalImages ? formData.additionalImages.split(",").map(s => s.trim()).filter(Boolean) : [],
              swatch: formData.swatch,
              shortDescription: formData.shortDescription,
              description: formData.description,
              badge: formData.badge,
              isPublished: formData.isPublished,
              isFeatured: formData.isFeatured,
              sortOrder: formData.sortOrder,
            });
          }}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ProductModal({
  title,
  initialData,
  categories,
  onClose,
  onSubmit,
  isLoading,
}: {
  title: string;
  initialData?: Partial<ProductFormData>;
  categories: Array<{ id: number; name: string }>;
  onClose: () => void;
  onSubmit: (data: ProductFormData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<ProductFormData>({
    name: initialData?.name || "",
    sku: initialData?.sku || "",
    categoryId: initialData?.categoryId || categories[0]?.id || 1,
    price: initialData?.price || 0,
    oldPrice: initialData?.oldPrice,
    stock: initialData?.stock || 0,
    lowStockThreshold: initialData?.lowStockThreshold ?? 5,
    image: initialData?.image || "https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=900&q=85",
    additionalImages: initialData?.additionalImages || "",
    swatch: initialData?.swatch || "#FFF8EF",
    shortDescription: initialData?.shortDescription || "",
    description: initialData?.description || "",
    badge: initialData?.badge || "",
    isPublished: initialData?.isPublished ?? true,
    isFeatured: initialData?.isFeatured ?? false,
    sortOrder: initialData?.sortOrder ?? 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    if (!formData.sku.trim()) {
      toast.error("SKU is required.");
      return;
    }
    if (formData.price < 0) {
      toast.error("Price cannot be negative.");
      return;
    }
    if (formData.stock < 0) {
      toast.error("Stock cannot be negative.");
      return;
    }
    onSubmit(formData);
  };

  return (
    <div className="overlay modal-centered" style={{ zIndex: 100 }}>
      <div className="overlay-scrim" onClick={onClose} />
      <div
        className="admin-panel"
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(680px, calc(100% - 32px))",
          maxHeight: "90vh",
          overflowY: "auto",
          padding: "24px 28px",
          background: "#ffffff",
          borderRadius: "8px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", borderBottom: "1px solid #e2e8f0", paddingBottom: "12px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 800, color: "#0f172a" }}>{title}</h2>
          <button onClick={onClose} style={{ border: 0, background: "transparent", cursor: "pointer", color: "#64748b" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: "14px" }}>
          {/* Row 1: Name and SKU */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Product Name *
              </label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Velvet Cover Sketchbook"
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                SKU *
              </label>
              <input
                required
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. SKU-VCS-001"
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
              />
            </div>
          </div>

          {/* Row 2: Category and Badge */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Category *
              </label>
              <select
                value={formData.categoryId}
                onChange={(e) => setFormData({ ...formData, categoryId: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Badge (e.g. BESTSELLER, NEW)
              </label>
              <input
                type="text"
                value={formData.badge || ""}
                onChange={(e) => setFormData({ ...formData, badge: e.target.value })}
                placeholder="Optional promotional badge"
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
              />
            </div>
          </div>

          {/* Row 3: Pricing */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Price (₹) *
              </label>
              <input
                required
                type="number"
                min="0"
                step="1"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Compare-at Price (₹)
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={formData.oldPrice || ""}
                onChange={(e) => setFormData({ ...formData, oldPrice: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Optional original price"
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
              />
            </div>
          </div>

          {/* Row 4: Stock and Low Stock Threshold */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Stock Quantity *
              </label>
              <input
                required
                type="number"
                min="0"
                value={formData.stock}
                onChange={(e) => setFormData({ ...formData, stock: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Low Stock Threshold
              </label>
              <input
                type="number"
                min="0"
                value={formData.lowStockThreshold}
                onChange={(e) => setFormData({ ...formData, lowStockThreshold: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
              />
            </div>
          </div>

          {/* Row 5: Image and Swatch */}
          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "12px", alignItems: "center" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Primary Image URL *
              </label>
              <input
                required
                type="url"
                value={formData.image}
                onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Swatch Color (Hex)
              </label>
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <input
                  type="color"
                  value={formData.swatch.startsWith("#") ? formData.swatch : "#FFF8EF"}
                  onChange={(e) => setFormData({ ...formData, swatch: e.target.value })}
                  style={{ width: "32px", height: "32px", border: "0", cursor: "pointer", background: "none" }}
                />
                <input
                  type="text"
                  value={formData.swatch}
                  onChange={(e) => setFormData({ ...formData, swatch: e.target.value })}
                  style={{ width: "100%", padding: "6px 8px", fontSize: "11px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
                />
              </div>
            </div>
          </div>

          {/* Image Preview */}
          {formData.image && (
            <div style={{ display: "flex", gap: "10px", alignItems: "center", background: "#f8fafc", padding: "8px", borderRadius: "6px" }}>
              <img
                src={formData.image}
                alt="Preview"
                style={{ width: "40px", height: "40px", objectFit: "cover", borderRadius: "4px", border: "1px solid #cbd5e1" }}
              />
              <span style={{ fontSize: "11px", color: "#64748b" }}>Image Preview · verified URL</span>
            </div>
          )}

          {/* Short Description */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              Short Description (Card Subtitle)
            </label>
            <input
              type="text"
              value={formData.shortDescription || ""}
              onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
              placeholder="Brief 1-line feature snippet"
              style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
            />
          </div>

          {/* Full Description */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              Full Description
            </label>
            <textarea
              rows={3}
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detailed product information..."
              style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
            />
          </div>

          {/* Checkboxes: Published and Featured */}
          <div style={{ display: "flex", gap: "24px", padding: "6px 0" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              />
              Publish immediately on storefront
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, color: "#334155", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={formData.isFeatured}
                onChange={(e) => setFormData({ ...formData, isFeatured: e.target.checked })}
              />
              Mark as Featured ⭐
            </label>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              style={{
                padding: "8px 16px",
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                borderRadius: "6px",
                fontSize: "12px",
                cursor: "pointer",
                color: "#475569",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="admin-primary"
              style={{ fontSize: "12px", padding: "8px 18px" }}
            >
              {isLoading ? "Saving…" : "Save Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
