"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Search, Edit2, Trash2, Users, Mail, X, Check } from "lucide-react";

interface Person {
  id: string;
  name: string;
  cell: string;
  office: string;
  email: string;
  position: string;
  isPrimary: boolean;
  notes: string;
}

interface Company {
  id: string;
  name: string;
  logo?: string;
  type: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  email: string;
  phone: string;
  website: string;
  apEmail: string;
  notes: string;
  contacts: Person[];
  _count?: { quotes: number; contacts: number };
}

const TYPES = ["Customer", "Supplier", "Subcontractor", "General Contractor", "Other"];

const emptyCompany = (): Partial<Company> => ({
  name: "", type: "Customer", address: "", city: "", province: "",
  postalCode: "", email: "", phone: "", website: "", apEmail: "", notes: "",
});

const emptyPerson = (): Partial<Person> => ({
  name: "", cell: "", office: "", email: "", position: "", isPrimary: false, notes: "",
});

export function ContactClient() {
  const [tab, setTab] = useState<"Company" | "People">("Company");
  const [companies, setCompanies] = useState<Company[]>([]);
  const [people, setPeople] = useState<(Person & { companyName: string })[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Company | null | "new">(null);
  const [form, setForm] = useState<Partial<Company>>(emptyCompany());
  const [personForm, setPersonForm] = useState<Partial<Person>>(emptyPerson());
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [addingPerson, setAddingPerson] = useState(false);
  const [saving, setSaving] = useState(false);

  const limit = 10;

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/companies?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    const data = await res.json();
    setCompanies(data.companies || []);
    setTotal(data.total || 0);
    setLoading(false);
  }, [page, search]);

  const fetchPeople = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/companies?limit=1000`);
    const data = await res.json();
    const all: (Person & { companyName: string })[] = [];
    for (const c of (data.companies || [])) {
      for (const p of (c.contacts || [])) {
        all.push({ ...p, companyName: c.name });
      }
    }
    setPeople(all);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (tab === "Company") fetchCompanies();
    else fetchPeople();
  }, [tab, fetchCompanies, fetchPeople]);

  function openNew() {
    setForm(emptyCompany());
    setModal("new");
  }

  function openEdit(c: Company) {
    setForm({ ...c });
    setModal(c);
  }

  async function saveCompany() {
    setSaving(true);
    const isNew = modal === "new";
    const url = isNew ? "/api/companies" : `/api/companies/${(modal as Company).id}`;
    const method = isNew ? "POST" : "PUT";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      await fetchCompanies();
      setModal(null);
    }
    setSaving(false);
  }

  async function deleteCompany(id: string) {
    if (!confirm("Delete this company and all its contacts?")) return;
    await fetch(`/api/companies/${id}`, { method: "DELETE" });
    fetchCompanies();
  }

  async function savePerson() {
    if (!modal || modal === "new") return;
    setSaving(true);
    const company = modal as Company;
    if (editingPerson) {
      await fetch(`/api/people/${editingPerson.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(personForm),
      });
    } else {
      await fetch(`/api/companies/${company.id}/people`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(personForm),
      });
    }
    const res = await fetch(`/api/companies/${company.id}`);
    const updated = await res.json();
    setModal(updated);
    setForm({ ...updated });
    setAddingPerson(false);
    setEditingPerson(null);
    setPersonForm(emptyPerson());
    setSaving(false);
  }

  async function deletePerson(personId: string) {
    if (!confirm("Remove this contact?")) return;
    await fetch(`/api/people/${personId}`, { method: "DELETE" });
    if (modal && modal !== "new") {
      const res = await fetch(`/api/companies/${(modal as Company).id}`);
      const updated = await res.json();
      setModal(updated);
    }
  }

  const totalPages = Math.ceil(total / limit);
  const initials = (name: string) => name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Contact Management</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
          <Plus size={16} /> Add Company
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between gap-4">
          <div className="flex gap-2">
            {(["Company", "People"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${tab === t ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                {t}
              </button>
            ))}
          </div>
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-orange-500" />
          </div>
        </div>

        {tab === "Company" ? (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left w-10"></th>
                  <th className="px-4 py-3 text-left">Company</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Primary Contact</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Phone</th>
                  <th className="px-4 py-3 text-left hidden lg:table-cell">Email</th>
                  <th className="px-4 py-3 text-left hidden md:table-cell">Type</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">Loading...</td></tr>
                ) : companies.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">No companies found</td></tr>
                ) : companies.map(c => {
                  const primary = c.contacts?.find(p => p.isPrimary) || c.contacts?.[0];
                  return (
                    <tr key={c.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        {c.logo ? (
                          <img src={c.logo} alt={c.name} className="w-8 h-8 rounded object-cover" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                            {initials(c.name)}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{c.name}</td>
                      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{primary?.name || ""}</td>
                      <td className="px-4 py-3 text-blue-600 hidden lg:table-cell">{c.phone}</td>
                      <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{c.email}</td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-xs">{c.type}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{c._count?.quotes ?? 0}</span>
                          <button className="p-1.5 text-gray-400 hover:text-gray-600"><Users size={14} /></button>
                          <button className="p-1.5 text-gray-400 hover:text-blue-600"><Mail size={14} /></button>
                          <button onClick={() => openEdit(c)} className="p-1.5 text-gray-400 hover:text-orange-500"><Edit2 size={14} /></button>
                          <button onClick={() => deleteCompany(c.id)} className="p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
              <span>Showing {Math.min((page - 1) * limit + 1, total)}–{Math.min(page * limit, total)} of {total} entries</span>
              <div className="flex gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Previous</button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const p = i + 1;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={`px-3 py-1 border rounded ${page === p ? "bg-gray-900 text-white border-gray-900" : "hover:bg-gray-50"}`}>{p}</button>
                  );
                })}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
              </div>
            </div>
          </>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Email</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Cell</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Position</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400">Loading...</td></tr>
              ) : people.length === 0 ? (
                <tr><td colSpan={5} className="py-12 text-center text-gray-400">No contacts found</td></tr>
              ) : people.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900 flex items-center gap-2">
                    {p.isPrimary && <Check size={12} className="text-green-500" />}
                    {p.name}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{p.companyName}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{p.email}</td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{p.cell}</td>
                  <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{p.position}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Company Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-2xl my-8">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold">{modal === "new" ? "Add Company" : "Manage Company"}</h2>
              <button onClick={() => setModal(null)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input value={form.name || ""} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type || "Customer"} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500">
                    {TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input value={form.address || ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">City / Province</label>
                  <input value={form.city || ""} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
                    placeholder="City" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 mb-2" />
                  <input value={form.province || ""} onChange={e => setForm(f => ({ ...f, province: e.target.value }))}
                    placeholder="Province" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Postal Code</label>
                  <input value={form.postalCode || ""} onChange={e => setForm(f => ({ ...f, postalCode: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Email</label>
                  <input type="email" value={form.email || ""} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Phone</label>
                  <input value={form.phone || ""} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                  <input value={form.website || ""} onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">A/P Email</label>
                  <input type="email" value={form.apEmail || ""} onChange={e => setForm(f => ({ ...f, apEmail: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={form.notes || ""} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>

              {/* Contacts sub-section */}
              {modal !== "new" && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-800">Contacts</h3>
                    <button onClick={() => { setAddingPerson(true); setEditingPerson(null); setPersonForm(emptyPerson()); }}
                      className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600">
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  {(addingPerson || editingPerson) && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <input placeholder="Name" value={personForm.name || ""} onChange={e => setPersonForm(f => ({ ...f, name: e.target.value }))}
                          className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
                        <input placeholder="Position" value={personForm.position || ""} onChange={e => setPersonForm(f => ({ ...f, position: e.target.value }))}
                          className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
                        <input placeholder="Cell" value={personForm.cell || ""} onChange={e => setPersonForm(f => ({ ...f, cell: e.target.value }))}
                          className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
                        <input placeholder="Office" value={personForm.office || ""} onChange={e => setPersonForm(f => ({ ...f, office: e.target.value }))}
                          className="border rounded px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-orange-500" />
                        <input placeholder="Email" type="email" value={personForm.email || ""} onChange={e => setPersonForm(f => ({ ...f, email: e.target.value }))}
                          className="border rounded px-2 py-1.5 text-sm col-span-2 focus:outline-none focus:ring-1 focus:ring-orange-500" />
                      </div>
                      <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={!!personForm.isPrimary} onChange={e => setPersonForm(f => ({ ...f, isPrimary: e.target.checked }))} />
                        Primary Contact
                      </label>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => { setAddingPerson(false); setEditingPerson(null); }} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-200 rounded">Cancel</button>
                        <button onClick={savePerson} disabled={saving} className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50">Save</button>
                      </div>
                    </div>
                  )}
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-500 border-b">
                      <tr>
                        <th className="text-left pb-1">Name</th>
                        <th className="text-left pb-1">Cell</th>
                        <th className="text-left pb-1">Email</th>
                        <th className="text-left pb-1">Position</th>
                        <th className="text-left pb-1">Primary</th>
                        <th></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(modal as Company).contacts?.map(p => (
                        <tr key={p.id}>
                          <td className="py-1.5">{p.name}</td>
                          <td className="py-1.5 text-gray-500">{p.cell}</td>
                          <td className="py-1.5 text-gray-500">{p.email}</td>
                          <td className="py-1.5 text-gray-500">{p.position}</td>
                          <td className="py-1.5">{p.isPrimary && <Check size={14} className="text-green-500" />}</td>
                          <td className="py-1.5">
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingPerson(p); setPersonForm({ ...p }); setAddingPerson(false); }}
                                className="p-1 text-gray-400 hover:text-orange-500"><Edit2 size={12} /></button>
                              <button onClick={() => deletePerson(p.id)} className="p-1 text-gray-400 hover:text-red-500"><Trash2 size={12} /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={saveCompany} disabled={saving || !form.name}
                className="px-4 py-2 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50">
                {saving ? "Saving..." : modal === "new" ? "Create" : "Update"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
