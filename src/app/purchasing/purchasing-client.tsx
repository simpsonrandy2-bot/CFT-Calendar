"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, X } from "lucide-react";

interface PO {
  id: string;
  poNumber: number;
  quantity: number;
  product: string;
  fob: string;
  orderedBy: string;
  orderDate?: string;
  shipDate?: string;
  deliveryDate?: string;
  dateReceived?: string;
  shipVia: string;
  status: string;
  notes: string;
}

const PRODUCTS = ["LR 2500", "LR 3500", "LR 4500", "LR3500 FR", "Maxxon Gyp-Crete High Performance", "Maxxon MF", "Maxxon Commercial Pro Level-Crete", "EXP Topping", "Quik-Top", "Other"];

const emptyPO = (): Partial<PO> => ({
  quantity: 550, product: "LR 3500", fob: "Gypsum, OH", orderedBy: "", shipVia: "", notes: "",
});

function fmt(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

function toInput(d?: string) {
  if (!d) return "";
  return new Date(d).toISOString().slice(0, 10);
}

export function PurchasingClient() {
  const [orders, setOrders] = useState<PO[]>([]);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState("Open");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<PO | null | "new">(null);
  const [form, setForm] = useState<Partial<PO>>(emptyPO());
  const [saving, setSaving] = useState(false);

  const limit = 25;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: page.toString(), limit: limit.toString(), status, search });
    const res = await fetch(`/api/purchase-orders?${params}`);
    const data = await res.json();
    setOrders(data.orders || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, status, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function save() {
    setSaving(true);
    const isNew = modal === "new";
    const url = isNew ? "/api/purchase-orders" : `/api/purchase-orders/${(modal as PO).id}`;
    const method = isNew ? "POST" : "PUT";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) { await fetchOrders(); setModal(null); }
    setSaving(false);
  }

  async function markReceived(po: PO) {
    await fetch(`/api/purchase-orders/${po.id}`, {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...po, status: "Received", dateReceived: new Date().toISOString() }),
    });
    fetchOrders();
  }

  async function deletePO(id: string) {
    if (!confirm("Delete this purchase order?")) return;
    await fetch(`/api/purchase-orders/${id}`, { method: "DELETE" });
    fetchOrders();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchasing</h1>
        <button onClick={() => { setForm(emptyPO()); setModal("new"); }}
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
          <Plus size={16} /> Add PO
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {["Open", "Received"].map(s => (
              <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${status === s ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="ml-auto relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">PO #</th>
                <th className="px-4 py-3 text-left">Qty</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">FOB</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Ordered By</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Order Date</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Ship Date</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">Delivery</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">Received</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">Ship Via</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={11} className="py-12 text-center text-gray-400">Loading...</td></tr>
              ) : orders.length === 0 ? (
                <tr><td colSpan={11} className="py-12 text-center text-gray-400">No purchase orders found</td></tr>
              ) : orders.map(po => (
                <tr key={po.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-medium">{po.poNumber}</td>
                  <td className="px-4 py-3">{po.quantity}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{po.product}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{po.fob}</td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{po.orderedBy}</td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{fmt(po.orderDate)}</td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{fmt(po.shipDate)}</td>
                  <td className="px-4 py-3 text-gray-600 hidden xl:table-cell">{fmt(po.deliveryDate)}</td>
                  <td className="px-4 py-3 text-gray-600 hidden xl:table-cell">{fmt(po.dateReceived)}</td>
                  <td className="px-4 py-3 text-gray-600 hidden xl:table-cell">{po.shipVia}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {po.status === "Open" && (
                        <button onClick={() => markReceived(po)} title="Mark Received"
                          className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200">Receive</button>
                      )}
                      <button onClick={() => { setForm({ ...po }); setModal(po); }} className="p-1.5 text-gray-400 hover:text-orange-500"><Edit2 size={14} /></button>
                      <button onClick={() => deletePO(po.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total} entries</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>

      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">{modal === "new" ? "New Purchase Order" : `Edit PO #${(modal as PO).poNumber}`}</h2>
              <button onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <select value={form.product || ""} onChange={e => setForm(f => ({ ...f, product: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                    {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity (bags)</label>
                  <input type="number" value={form.quantity || ""} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">FOB (Ship From)</label>
                  <input value={form.fob || ""} onChange={e => setForm(f => ({ ...f, fob: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ordered By</label>
                  <input value={form.orderedBy || ""} onChange={e => setForm(f => ({ ...f, orderedBy: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order Date</label>
                  <input type="date" value={toInput(form.orderDate)} onChange={e => setForm(f => ({ ...f, orderDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ship Date</label>
                  <input type="date" value={toInput(form.shipDate)} onChange={e => setForm(f => ({ ...f, shipDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Date</label>
                  <input type="date" value={toInput(form.deliveryDate)} onChange={e => setForm(f => ({ ...f, deliveryDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ship Via</label>
                  <input value={form.shipVia || ""} onChange={e => setForm(f => ({ ...f, shipVia: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={save} disabled={saving || !form.product}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                {saving ? "Saving..." : modal === "new" ? "Create PO" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
