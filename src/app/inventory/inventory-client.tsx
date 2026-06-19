"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, X, ArrowDown, ArrowUp, RefreshCw } from "lucide-react";

interface InventoryProduct {
  id: string;
  name: string;
  quantity: number;
  onJobSite: number;
  onOrder: number;
  _count?: { transactions: number };
}

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  reference: string;
  notes: string;
  date: string;
  createdBy: string;
}

export function InventoryClient() {
  const [tab, setTab] = useState("By Product");
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [productModal, setProductModal] = useState<InventoryProduct | null | "new">(null);
  const [productForm, setProductForm] = useState({ name: "", quantity: 0, onJobSite: 0, onOrder: 0 });
  const [txModal, setTxModal] = useState<InventoryProduct | null>(null);
  const [txForm, setTxForm] = useState({ type: "in", quantity: 0, reference: "", notes: "", date: new Date().toISOString().slice(0, 10) });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [saving, setSaving] = useState(false);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/inventory?search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setProducts(data || []);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  async function openTransactions(product: InventoryProduct) {
    setTxModal(product);
    const res = await fetch(`/api/inventory/${product.id}/transactions`);
    setTransactions(await res.json());
  }

  async function saveProduct() {
    setSaving(true);
    const isNew = productModal === "new";
    const url = isNew ? "/api/inventory" : `/api/inventory/${(productModal as InventoryProduct).id}`;
    const method = isNew ? "POST" : "PUT";
    await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(productForm) });
    await fetchProducts();
    setProductModal(null);
    setSaving(false);
  }

  async function deleteProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    await fetch(`/api/inventory/${id}`, { method: "DELETE" });
    fetchProducts();
  }

  async function saveTransaction() {
    if (!txModal) return;
    setSaving(true);
    await fetch(`/api/inventory/${txModal.id}/transactions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(txForm),
    });
    await fetchProducts();
    await openTransactions(txModal);
    setTxForm({ type: "in", quantity: 0, reference: "", notes: "", date: new Date().toISOString().slice(0, 10) });
    setSaving(false);
  }

  const txIcon = (type: string) => {
    if (type === "in") return <ArrowDown size={14} className="text-green-600" />;
    if (type === "out") return <ArrowUp size={14} className="text-red-500" />;
    return <RefreshCw size={14} className="text-blue-500" />;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
        <button onClick={() => { setProductForm({ name: "", quantity: 0, onJobSite: 0, onOrder: 0 }); setProductModal("new"); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {["By Product", "Transactions"].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="ml-auto relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="px-4 py-3 text-left">Material</th>
              <th className="px-4 py-3 text-right">Quantity</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">On Job Site</th>
              <th className="px-4 py-3 text-right hidden md:table-cell">On Order</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400">Loading...</td></tr>
            ) : products.length === 0 ? (
              <tr><td colSpan={5} className="py-12 text-center text-gray-400">No products found</td></tr>
            ) : products.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                <td className={`px-4 py-3 text-right font-mono ${p.quantity < 0 ? "text-red-500" : "text-gray-900"}`}>
                  {p.quantity.toLocaleString()}
                </td>
                <td className="px-4 py-3 text-right font-mono text-gray-600 hidden md:table-cell">{p.onJobSite.toLocaleString()}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-600 hidden md:table-cell">{p.onOrder.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    <button onClick={() => openTransactions(p)}
                      className="flex items-center gap-1 px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-xs font-medium text-gray-600">
                      <span>{p._count?.transactions ?? 0}</span>
                    </button>
                    <button onClick={() => { setProductForm({ name: p.name, quantity: p.quantity, onJobSite: p.onJobSite, onOrder: p.onOrder }); setProductModal(p); }}
                      className="p-1.5 text-gray-400 hover:text-orange-500"><Edit2 size={14} /></button>
                    <button onClick={() => deleteProduct(p.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="px-4 py-2 border-t text-xs text-gray-400">{products.length} products</div>
      </div>

      {/* Product Modal */}
      {productModal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">{productModal === "new" ? "Add Product" : "Edit Product"}</h2>
              <button onClick={() => setProductModal(null)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input value={productForm.name} onChange={e => setProductForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input type="number" value={productForm.quantity} onChange={e => setProductForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">On Job Site</label>
                  <input type="number" value={productForm.onJobSite} onChange={e => setProductForm(f => ({ ...f, onJobSite: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">On Order</label>
                  <input type="number" value={productForm.onOrder} onChange={e => setProductForm(f => ({ ...f, onOrder: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button onClick={() => setProductModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={saveProduct} disabled={saving || !productForm.name}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                {saving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Modal */}
      {txModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">{txModal.name} — Transactions</h2>
              <button onClick={() => setTxModal(null)}><X size={20} /></button>
            </div>
            <div className="p-6">
              {/* Add transaction form */}
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Transaction</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Type</label>
                    <select value={txForm.type} onChange={e => setTxForm(f => ({ ...f, type: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none">
                      <option value="in">In (received)</option>
                      <option value="out">Out (used)</option>
                      <option value="adjust">Adjust</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Quantity</label>
                    <input type="number" value={txForm.quantity} onChange={e => setTxForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date</label>
                    <input type="date" value={txForm.date} onChange={e => setTxForm(f => ({ ...f, date: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Reference (PO#, Job#)</label>
                    <input value={txForm.reference} onChange={e => setTxForm(f => ({ ...f, reference: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs text-gray-500 mb-1">Notes</label>
                    <input value={txForm.notes} onChange={e => setTxForm(f => ({ ...f, notes: e.target.value }))}
                      className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none" />
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button onClick={saveTransaction} disabled={saving || txForm.quantity === 0}
                    className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                    {saving ? "Saving..." : "Add Transaction"}
                  </button>
                </div>
              </div>

              {/* Transaction history */}
              <table className="w-full text-sm">
                <thead className="text-xs text-gray-500 border-b">
                  <tr>
                    <th className="text-left pb-2">Type</th>
                    <th className="text-right pb-2">Qty</th>
                    <th className="text-left pb-2">Date</th>
                    <th className="text-left pb-2">Reference</th>
                    <th className="text-left pb-2">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map(tx => (
                    <tr key={tx.id}>
                      <td className="py-2 flex items-center gap-1">{txIcon(tx.type)}<span className="capitalize">{tx.type}</span></td>
                      <td className={`py-2 text-right font-mono ${tx.type === "out" ? "text-red-500" : "text-green-600"}`}>
                        {tx.type === "out" ? "-" : "+"}{tx.quantity}
                      </td>
                      <td className="py-2 text-gray-500">{new Date(tx.date).toLocaleDateString("en-CA")}</td>
                      <td className="py-2 text-gray-600">{tx.reference}</td>
                      <td className="py-2 text-gray-500">{tx.notes}</td>
                    </tr>
                  ))}
                  {transactions.length === 0 && (
                    <tr><td colSpan={5} className="py-6 text-center text-gray-400">No transactions yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
