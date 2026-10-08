import { useState } from "react";
import { Check, Edit3, Package, Save } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

export default function AdminInventory() {
  const catalogQuery = trpc.catalog.list.useQuery(undefined, { staleTime: 30_000 });
  const updateStock = trpc.catalog.updateStock.useMutation({
    onSuccess: () => {
      toast.success("Stock updated");
      void catalogQuery.refetch();
    },
    onError: (error) => toast.error(error.message || "Owner access is required to update inventory"),
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState(0);
  const items = catalogQuery.data ?? [];

  return <section className="admin-panel inventory-manager">
    <div className="panel-head"><div><h3>Catalog inventory</h3><p>Live products from the managed catalog</p></div><span className="inventory-count"><Package size={14} /> {items.length} products</span></div>
    <div className="inventory-table">
      <div className="inventory-row inventory-header"><span>Product</span><span>Category</span><span>Stock</span><span>Visibility</span><span /></div>
      {items.map((item) => <div className="inventory-row" key={item.id}>
        <div className="inventory-product"><span className="inventory-swatch" style={{ background: item.swatch }} /><div><b>{item.name}</b><small>{item.id}</small></div></div>
        <span className="inventory-category">{item.category}</span>
        <div className="inventory-stock">{editing === item.id ? <div className="stock-editor"><input aria-label={`Stock for ${item.name}`} type="number" min="0" value={draft} onChange={(event) => setDraft(Number(event.target.value))} /><button aria-label={`Save stock for ${item.name}`} onClick={() => { updateStock.mutate({ slug: item.id, stock: draft }); setEditing(null); }}><Save size={14} /></button></div> : <><b className={item.lowStock ? "low" : "ok"}>{item.stock}</b>{item.lowStock && <small>Low stock</small>}</>}</div>
        <span className="inventory-published"><Check size={13} /> Published</span>
        <button className="inventory-edit" aria-label={`Edit stock for ${item.name}`} onClick={() => { setEditing(item.id); setDraft(item.stock); }}><Edit3 size={14} /></button>
      </div>)}
    </div>
    {catalogQuery.isLoading && <div className="inventory-loading"><span className="loading-dot" /> Loading live catalog...</div>}
    {!catalogQuery.isLoading && catalogQuery.isError && <div className="inventory-loading"><Check size={14} /> Catalog is showing fallback data until the database reconnects.</div>}
  </section>;
}
