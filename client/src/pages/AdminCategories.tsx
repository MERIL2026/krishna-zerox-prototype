import { useState } from "react";
import {
  AlertCircle,
  Archive,
  ChevronRight,
  Edit,
  Eye,
  EyeOff,
  FolderPlus,
  Layers,
  LockKeyhole,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import AdminGate from "@/components/AdminGate";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

interface CategoryFormData {
  name: string;
  slug?: string;
  description?: string;
  color: string;
  image?: string;
  sortOrder: number;
  isPublished: boolean;
}

const COLOR_OPTIONS = [
  { label: "Pink", value: "pink", hex: "#fbcfe8" },
  { label: "Yellow", value: "yellow", hex: "#fef08a" },
  { label: "Lavender", value: "lavender", hex: "#e9d5ff" },
  { label: "Mint", value: "mint", hex: "#a7f3d0" },
  { label: "Purple", value: "purple", hex: "#d8b4fe" },
  { label: "Cyan", value: "cyan", hex: "#bae6fd" },
  { label: "Peach", value: "peach", hex: "#fed7aa" },
  { label: "Cream", value: "cream", hex: "#fef9c3" },
];

export default function AdminCategories() {
  const { user, loading, logout } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any | null>(null);

  const categoriesQuery = trpc.catalog.adminCategories.useQuery(undefined, {
    enabled: Boolean(user && ["owner", "admin", "staff"].includes(user.role)),
  });

  const canWrite = Boolean(user && ["owner", "admin"].includes(user.role));

  const createMutation = trpc.catalog.createCategory.useMutation({
    onSuccess: () => {
      toast.success("Category created successfully");
      setIsCreateOpen(false);
      void categoriesQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create category");
    },
  });

  const updateMutation = trpc.catalog.updateCategory.useMutation({
    onSuccess: () => {
      toast.success("Category updated successfully");
      setEditingCategory(null);
      void categoriesQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update category");
    },
  });

  const archiveMutation = trpc.catalog.archiveCategory.useMutation({
    onSuccess: (data) => {
      toast.success(data.isPublished ? "Category activated" : "Category archived");
      void categoriesQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update status");
    },
  });

  const deleteMutation = trpc.catalog.deleteCategory.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      void categoriesQuery.refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to delete category");
    },
  });

  const rawCategories = categoriesQuery.data ?? [];

  const filteredCategories = rawCategories.filter((c) => {
    if (searchTerm.trim()) {
      const hay = `${c.name} ${c.slug} ${c.description}`.toLowerCase();
      if (!hay.includes(searchTerm.toLowerCase().trim())) return false;
    }
    if (statusFilter === "ACTIVE" && !c.isPublished) return false;
    if (statusFilter === "ARCHIVED" && c.isPublished) return false;
    return true;
  });

  const isOperationsUser = Boolean(user && ["owner", "admin", "staff"].includes(user.role));
  if (loading || !user || !isOperationsUser) {
    return <AdminGate loading={loading} user={user} onLogout={logout} />;
  }

  return (
    <div className="admin-page">
      {/* Sidebar */}
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
          <a href="/admin/products">
            <span>□</span> Products
          </a>
          <a className="active" href="/admin/categories">
            <span>◫</span> Categories <b>{rawCategories.length}</b>
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

      {/* Main Content */}
      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "11px", color: "#64748b" }}>
              <Link href="/admin" style={{ color: "#64748b", textDecoration: "none" }}>Dashboard</Link>
              <span>/</span>
              <span>Catalog</span>
            </div>
            <h1>Category Management</h1>
          </div>
          <div className="admin-top-actions">
            {canWrite && (
              <button
                className="admin-primary"
                onClick={() => setIsCreateOpen(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
              >
                <Plus size={15} /> Add category
              </button>
            )}
            <button
              className="admin-icon"
              title="Refresh categories"
              onClick={() => void categoriesQuery.refetch()}
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <div className="admin-content" style={{ padding: "30px 42px" }}>
          {/* Filter Bar */}
          <section className="admin-panel" style={{ padding: "18px 24px", marginBottom: "20px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", gap: "10px", alignItems: "center", flex: "1 1 300px" }}>
                <div style={{ position: "relative", minWidth: "240px", flex: "1" }}>
                  <Search size={15} style={{ position: "absolute", left: "10px", top: "10px", color: "#94a3b8" }} />
                  <input
                    type="text"
                    placeholder="Search categories..."
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
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    padding: "8px 12px",
                    fontSize: "12px",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    background: "#ffffff",
                  }}
                >
                  <option value="ALL">All Statuses</option>
                  <option value="ACTIVE">Active (Live)</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              </div>

              <div style={{ fontSize: "12px", color: "#64748b", fontWeight: 600 }}>
                {filteredCategories.length} {filteredCategories.length === 1 ? "category" : "categories"}
              </div>
            </div>
          </section>

          {/* Categories Table */}
          <section className="admin-panel" style={{ overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                    <th style={{ padding: "12px 16px" }}>Category</th>
                    <th style={{ padding: "12px 14px" }}>Slug</th>
                    <th style={{ padding: "12px 14px" }}>Color Tone</th>
                    <th style={{ padding: "12px 14px" }}>Products</th>
                    <th style={{ padding: "12px 14px" }}>Order</th>
                    <th style={{ padding: "12px 14px" }}>Status</th>
                    <th style={{ padding: "12px 16px", textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCategories.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                        {categoriesQuery.isLoading ? (
                          <span>Loading categories...</span>
                        ) : (
                          <span>No categories match your search.</span>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredCategories.map((c) => {
                      const colorObj = COLOR_OPTIONS.find((col) => col.value === c.color);

                      return (
                        <tr key={c.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                          <td style={{ padding: "12px 16px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                              <span
                                style={{
                                  width: "18px",
                                  height: "18px",
                                  borderRadius: "4px",
                                  background: colorObj?.hex || "#e2e8f0",
                                  border: "1px solid rgba(0,0,0,0.1)",
                                }}
                              />
                              <div>
                                <strong style={{ color: "#1e293b", fontWeight: 700 }}>{c.name}</strong>
                                {c.description && (
                                  <small style={{ display: "block", color: "#94a3b8", fontSize: "10px" }}>
                                    {c.description}
                                  </small>
                                )}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <code style={{ padding: "2px 6px", background: "#f1f5f9", borderRadius: "4px", color: "#475569" }}>
                              {c.slug}
                            </code>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span style={{ textTransform: "capitalize", color: "#475569" }}>{c.color}</span>
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                background: "#f1f5f9",
                                borderRadius: "10px",
                                fontWeight: 700,
                                color: "#334155",
                              }}
                            >
                              {c.productCount} {c.productCount === 1 ? "item" : "items"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 14px", color: "#64748b" }}>
                            #{c.sortOrder}
                          </td>
                          <td style={{ padding: "12px 14px" }}>
                            <span
                              style={{
                                padding: "2px 8px",
                                borderRadius: "10px",
                                fontSize: "11px",
                                fontWeight: 600,
                                background: c.isPublished ? "#ecfdf5" : "#f1f5f9",
                                color: c.isPublished ? "#059669" : "#64748b",
                              }}
                            >
                              {c.isPublished ? "Active" : "Archived"}
                            </span>
                          </td>
                          <td style={{ padding: "12px 16px", textAlign: "right" }}>
                            {canWrite && (
                              <div style={{ display: "inline-flex", gap: "6px" }}>
                                <button
                                  className="inventory-edit"
                                  title="Edit category"
                                  onClick={() => setEditingCategory(c)}
                                >
                                  <Edit size={14} />
                                </button>
                                <button
                                  className="inventory-edit"
                                  title={c.isPublished ? "Archive category" : "Activate category"}
                                  onClick={() => archiveMutation.mutate({ id: c.id, isPublished: !c.isPublished })}
                                >
                                  {c.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                                <button
                                  className="inventory-edit"
                                  title="Delete category (safe check)"
                                  style={{ color: "#ef4444" }}
                                  onClick={() => {
                                    if (c.productCount > 0) {
                                      toast.error(`Cannot delete "${c.name}" because ${c.productCount} product(s) belong to it. Reassign or delete the products first.`);
                                      return;
                                    }
                                    if (window.confirm(`Permanently delete category "${c.name}"?`)) {
                                      deleteMutation.mutate({ id: c.id });
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

      {/* CREATE CATEGORY MODAL */}
      {isCreateOpen && (
        <CategoryModal
          title="Create New Category"
          onClose={() => setIsCreateOpen(false)}
          onSubmit={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
        />
      )}

      {/* EDIT CATEGORY MODAL */}
      {editingCategory && (
        <CategoryModal
          title={`Edit Category: ${editingCategory.name}`}
          initialData={editingCategory}
          onClose={() => setEditingCategory(null)}
          onSubmit={(data) => updateMutation.mutate({ id: editingCategory.id, ...data })}
          isLoading={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function CategoryModal({
  title,
  initialData,
  onClose,
  onSubmit,
  isLoading,
}: {
  title: string;
  initialData?: Partial<CategoryFormData>;
  onClose: () => void;
  onSubmit: (data: CategoryFormData) => void;
  isLoading: boolean;
}) {
  const [formData, setFormData] = useState<CategoryFormData>({
    name: initialData?.name || "",
    slug: initialData?.slug || "",
    description: initialData?.description || "",
    color: initialData?.color || "pink",
    image: initialData?.image || "",
    sortOrder: initialData?.sortOrder ?? 0,
    isPublished: initialData?.isPublished ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      toast.error("Category name is required.");
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
          width: "min(520px, calc(100% - 32px))",
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
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              Category Name *
            </label>
            <input
              required
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Desk Accessories"
              style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              Custom Slug (optional, auto-generated if blank)
            </label>
            <input
              type="text"
              value={formData.slug || ""}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="e.g. desk-accessories"
              style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description || ""}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Brief tagline or description"
              style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Color Tone
              </label>
              <select
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px", background: "#fff" }}
              >
                {COLOR_OPTIONS.map((col) => (
                  <option key={col.value} value={col.value}>
                    {col.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#475569", marginBottom: "4px" }}>
                Sort Order
              </label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                style={{ width: "100%", padding: "8px 10px", fontSize: "12px", border: "1px solid #cbd5e1", borderRadius: "6px" }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "12px", fontWeight: 600, color: "#334155", cursor: "pointer", marginTop: "6px" }}>
              <input
                type="checkbox"
                checked={formData.isPublished}
                onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
              />
              Category is active &amp; visible on storefront
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "14px", borderTop: "1px solid #e2e8f0", paddingTop: "14px" }}>
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
              {isLoading ? "Saving…" : "Save Category"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
