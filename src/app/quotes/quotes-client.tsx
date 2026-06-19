"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Plus, Search, Edit2, Trash2, ThumbsUp, ThumbsDown, X, FileText, CalendarDays } from "lucide-react";

interface QuoteItem {
  id?: string;
  sortOrder: number;
  itemType: string;
  jobType: string;
  squareFootage: number;
  floors: string;
  levels: number;
  mobs: number;
  pouringOn: string;
  product1: string;
  product2: string;
  avgThickness: string;
  strengthPsi: number;
  projectCost: number;
  notes: string;
  estimateProduct1: string;
  estimateQty1: number;
  estimateProduct2: string;
  estimateQty2: number;
  excludeSqFt: boolean;
}

interface QuoteChecklist {
  id: string;
  section: string;
  text: string;
  checked: boolean;
  sortOrder: number;
}

interface Company {
  id: string;
  name: string;
  logo?: string;
  address?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
  email?: string;
  contacts?: { id: string; name: string; email: string; cell: string; position: string; isPrimary: boolean }[];
}

interface Quote {
  id: string;
  quoteNumber: string;
  company?: Company;
  companyId?: string;
  projectName: string;
  address: string;
  location: string;
  buildingType: string;
  contactMethod: string;
  authorName: string;
  status: string;
  createdAt: string;
  items: QuoteItem[];
  checklistItems?: QuoteChecklist[];
  quoteContacts?: { person: { id: string; name: string; email: string; cell: string; position: string } }[];
}

const JOB_TYPES = ["Precast", "Wood Frame", "Radiant Heat", "Wood Fr SM", "Leveling", "Other"];
const PRODUCTS = ["None", "LR 2500", "LR 3500", "LR 4500", "LR3500 FR", "Maxxon Gyp-Crete High Performance", "Maxxon MF", "Maxxon Commercial Pro Level-Crete", "EXP Topping", "Quik-Top"];
const THICKNESSES = ["1/4\"", "3/8\"", "1/2\"", "5/8\"", "3/4\"", "7/8\"", "1\"", "1-1/4\"", "1-1/2\"", "1-3/4\"", "2\"", "2-1/4\"", "2-1/2\"", "2-3/4\"", "3\""];
const POURING_OPTIONS = ["Concrete", "Wood", "Steel", "Gypcrete"];
const BUILDING_TYPES = ["Apartments", "Commercial", "Condo", "Custom Home", "Hospital", "Hotel", "House", "Industrial", "Institutional", "Residential", "Retail", "Retirement LTC", "Student Res"];
const CONTACT_METHODS = ["Email", "Phone Call", "In Person", "Text"];
const SECTIONS = ["jobDetails", "scopeOfWork", "provisions", "exclusions", "miscCharges", "terms"];
const SECTION_LABELS: Record<string, string> = {
  jobDetails: "Job Details",
  scopeOfWork: "Scope of Work",
  provisions: "Provisions by General Contractor/Owner/Builder",
  exclusions: "Exclusions",
  miscCharges: "Miscellaneous Charges",
  terms: "Terms",
};

const STATUS_COLORS: Record<string, string> = {
  Draft: "bg-gray-100 text-gray-600",
  Pending: "bg-yellow-100 text-yellow-700",
  Locked: "bg-blue-100 text-blue-700",
  Finalized: "bg-green-100 text-green-700",
  Won: "bg-green-100 text-green-700",
  Lost: "bg-red-100 text-red-700",
};

const emptyItem = (): QuoteItem => ({
  sortOrder: 0, itemType: "Item", jobType: "Precast", squareFootage: 0,
  floors: "Main", levels: 1, mobs: 1, pouringOn: "Concrete", product1: "LR 2500",
  product2: "None", avgThickness: "1-1/2\"", strengthPsi: 2500, projectCost: 0,
  notes: "", estimateProduct1: "LR 2500", estimateQty1: 0, estimateProduct2: "None",
  estimateQty2: 0, excludeSqFt: false,
});

export function QuotesClient() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ status: string; _count: number }[]>([]);
  const [statusFilter, setStatusFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Quote | null | "new">(null);
  const [form, setForm] = useState<Partial<Quote & { items: QuoteItem[] }>>({});
  const [checklistItems, setChecklistItems] = useState<QuoteChecklist[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [saving, setSaving] = useState(false);
  const [calModal, setCalModal] = useState<Quote | null>(null);
  const [pourDate, setPourDate] = useState("");
  const [scheduled, setScheduled] = useState<Set<string>>(new Set());
  const [newChecklistText, setNewChecklistText] = useState<Record<string, string>>({});
  const [companySearch, setCompanySearch] = useState("");
  const [companyOpen, setCompanyOpen] = useState(false);
  const [selectedPersonIds, setSelectedPersonIds] = useState<Set<string>>(new Set());
  const [contactPickerOpen, setContactPickerOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const didAutoOpen = useRef(false);

  const limit = 25;

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({
      page: page.toString(), limit: limit.toString(),
      status: statusFilter, year: yearFilter, search,
    });
    const res = await fetch(`/api/quotes?${params}`);
    const data = await res.json();
    setQuotes(data.quotes || []);
    setTotal(data.total || 0);
    setStats(data.stats || []);
    setLoading(false);
  }, [page, statusFilter, yearFilter, search]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  useEffect(() => {
    fetch("/api/companies?limit=1000").then(r => r.json()).then(d => setCompanies(d.companies || []));
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1" && !didAutoOpen.current) {
      didAutoOpen.current = true;
      router.replace("/quotes");
      openNew();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  async function openNew() {
    const numRes = await fetch("/api/quotes/next-number");
    const { quoteNumber } = await numRes.json();
    setForm({ quoteNumber, items: [emptyItem()], status: "Draft" });
    setChecklistItems([]);
    setCompanySearch("");
    setSelectedPersonIds(new Set());
    setContactPickerOpen(false);
    setModal("new");
  }

  async function openEdit(q: Quote) {
    const res = await fetch(`/api/quotes/${q.id}`);
    const full = await res.json();
    setForm({ ...full, items: full.items || [emptyItem()] });
    setChecklistItems(full.checklistItems || []);
    const existing = companies.find(c => c.id === full.companyId);
    setCompanySearch(existing?.name || "");
    setSelectedPersonIds(new Set((full.quoteContacts || []).map((qc: { person: { id: string } }) => qc.person.id)));
    setModal(full);
  }

  async function save() {
    setSaving(true);
    const isNew = modal === "new";
    const url = isNew ? "/api/quotes" : `/api/quotes/${(modal as Quote).id}`;
    const method = isNew ? "POST" : "PUT";
    const body = { ...form, checklistItems, selectedPersonIds: Array.from(selectedPersonIds) };
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) {
      await fetchQuotes();
      setModal(null);
    }
    setSaving(false);
  }

  async function changeStatus(id: string, action: string) {
    await fetch(`/api/quotes/${id}/status`, {
      method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    fetchQuotes();
  }

  async function deleteQuote(id: string) {
    if (!confirm("Delete this quote?")) return;
    await fetch(`/api/quotes/${id}`, { method: "DELETE" });
    fetchQuotes();
  }

  async function schedulePour(q: Quote, date: string) {
    if (!date) return;
    const totalCost = q.items.reduce((a, i) => a + i.projectCost, 0);
    const firstItem = q.items[0];
    const res = await fetch("/api/jobs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobNumber: q.quoteNumber,
        title: q.projectName || q.company?.name || q.quoteNumber,
        customer: q.company?.name || "",
        jobType: firstItem?.jobType || "",
        address: q.address || q.location || "",
        jobLead: q.authorName || "",
        siteContact: "",
        startDate: date,
        endDate: date,
        description: `Quote ${q.quoteNumber} — $${totalCost.toLocaleString()}`,
        colorTag: "#f97316",
      }),
    });
    if (!res.ok) {
      alert("Failed to add to calendar. Please try again.");
      return;
    }
    setScheduled(prev => new Set(prev).add(q.id));
    setCalModal(null);
    setPourDate("");
  }

  function addItem() {
    setForm(f => ({ ...f, items: [...(f.items || []), { ...emptyItem(), sortOrder: (f.items?.length || 0) }] }));
  }

  function updateItem(i: number, field: keyof QuoteItem, value: unknown) {
    setForm(f => {
      const items = [...(f.items || [])];
      items[i] = { ...items[i], [field]: value };
      return { ...f, items };
    });
  }

  function removeItem(i: number) {
    setForm(f => ({ ...f, items: (f.items || []).filter((_, idx) => idx !== i) }));
  }

  function toggleChecklist(id: string) {
    setChecklistItems(items => items.map(ci => ci.id === id ? { ...ci, checked: !ci.checked } : ci));
  }

  function deleteChecklistItem(id: string) {
    setChecklistItems(items => items.filter(ci => ci.id !== id));
  }

  function addChecklistItem(section: string) {
    const text = newChecklistText[section]?.trim();
    if (!text) return;
    const sectionItems = checklistItems.filter(ci => ci.section === section);
    const tempId = `new-${Date.now()}-${Math.random()}`;
    setChecklistItems(items => [...items, { id: tempId, section, text, checked: true, sortOrder: sectionItems.length }]);
    setNewChecklistText(prev => ({ ...prev, [section]: "" }));
  }

  const pendingCount = stats.find(s => s.status === "Pending")?._count ?? 0;
  const wonCount = stats.find(s => s.status === "Won")?._count ?? 0;
  const totalForYear = stats.reduce((a, s) => a + s._count, 0);
  const winRate = totalForYear > 0 ? Math.round((wonCount / totalForYear) * 100) : 0;
  const isLocked = modal !== "new" && (modal as Quote)?.status === "Locked";
  const isFinalized = modal !== "new" && (modal as Quote)?.status === "Finalized";
  const readOnly = isLocked || isFinalized;

  const years = Array.from({ length: 5 }, (_, i) => (new Date().getFullYear() - i).toString());

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quotes</h1>
        <button onClick={openNew} className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600">
          <Plus size={16} /> New Quote
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-3 sm:gap-4 mb-6">
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 text-center">
          <div className="text-3xl font-bold text-gray-900">{pendingCount.toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1">Pending Quotes</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 text-center">
          <div className="text-3xl font-bold text-gray-900">{wonCount.toLocaleString()}</div>
          <div className="text-sm text-gray-500 mt-1"># of Quotes Won</div>
        </div>
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200 text-center">
          <div className="text-3xl font-bold text-gray-900">{winRate}</div>
          <div className="text-sm text-gray-500 mt-1">% Quotes Won</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Filters */}
        <div className="p-4 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {["All", "Pending", "Lost", "Won"].map(s => (
              <button key={s} onClick={() => { setStatusFilter(s); setPage(1); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${statusFilter === s ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
                {s}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <select value={yearFilter} onChange={e => setYearFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none">
              {years.map(y => <option key={y}>{y}</option>)}
            </select>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
                placeholder="Search..." className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-48 focus:outline-none focus:ring-2 focus:ring-orange-500" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-2 py-3 text-left w-12 sm:w-20"></th>
                <th className="px-2 py-3 text-left">Company</th>
                <th className="px-4 py-3 text-left hidden md:table-cell">Location</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Date</th>
                <th className="px-4 py-3 text-left hidden lg:table-cell">Author</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">Job Type</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">Sq ft</th>
                <th className="px-4 py-3 text-left hidden xl:table-cell">Product</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={10} className="py-12 text-center text-gray-400">Loading...</td></tr>
              ) : quotes.length === 0 ? (
                <tr><td colSpan={10} className="py-12 text-center text-gray-400">No quotes found</td></tr>
              ) : quotes.map(q => {
                const totalCost = q.items.reduce((a, i) => a + i.projectCost, 0);
                const firstItem = q.items[0];
                return (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <td className="px-2 py-3">
                      {q.company?.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={q.company.logo} alt={q.company.name} className="w-10 h-10 sm:w-16 sm:h-16 rounded-lg object-contain bg-white border border-gray-100 p-0.5" />
                      ) : (
                        <div className="w-10 h-10 sm:w-16 sm:h-16 rounded-lg bg-orange-100 flex items-center justify-center text-sm sm:text-base font-bold text-orange-600 border border-orange-200">
                          {q.company?.name?.slice(0, 2).toUpperCase() || "??"}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <div className="font-medium text-gray-900">{q.company?.name || "—"}</div>
                      <div className="text-xs text-gray-400">{q.quoteNumber}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{q.location}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{new Date(q.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}</td>
                    <td className="px-4 py-3 text-gray-600 hidden lg:table-cell">{q.authorName}</td>
                    <td className="px-4 py-3 text-gray-600 hidden xl:table-cell">{firstItem?.jobType}</td>
                    <td className="px-4 py-3 text-gray-600 hidden xl:table-cell">{firstItem?.squareFootage?.toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600 hidden xl:table-cell">{firstItem?.product1}</td>
                    <td className="px-2 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[q.status] || "bg-gray-100 text-gray-600"}`}>{q.status}</span>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-0.5">
                        {totalCost > 0 && (
                          <span className="px-1.5 py-0.5 bg-orange-500 text-white rounded text-xs font-medium mr-1">
                            ${totalCost.toLocaleString()}
                          </span>
                        )}

                        {/* PDF — always visible */}
                        <button
                          title="View PDF"
                          onClick={() => window.open(`/api/quotes/${q.id}/print`, "_blank")}
                          className="p-1.5 text-gray-400 hover:text-gray-700"
                        >
                          <FileText size={14} />
                        </button>

                        {/* Thumbs up — hidden on mobile */}
                        <button
                          title={q.status === "Locked" ? "Un-approve (back to Pending)" : "Approve & Lock"}
                          onClick={() => changeStatus(q.id, q.status === "Locked" ? "pending" : "approve")}
                          className={`hidden sm:inline-flex p-1.5 ${q.status === "Locked" ? "text-green-600 hover:text-yellow-500" : "text-gray-400 hover:text-green-600"}`}
                        >
                          <ThumbsUp size={14} />
                        </button>

                        {/* Thumbs down — hidden on mobile */}
                        <button
                          title="Reject"
                          onClick={() => changeStatus(q.id, q.status === "Lost" ? "draft" : "reject")}
                          className={`hidden sm:inline-flex p-1.5 ${q.status === "Lost" ? "text-red-500 hover:text-gray-400" : "text-gray-400 hover:text-red-500"}`}
                        >
                          <ThumbsDown size={14} />
                        </button>

                        {/* Calendar — hidden on mobile */}
                        <button
                          title={q.status === "Locked" ? scheduled.has(q.id) ? "Added to calendar" : "Schedule pour date" : "Approve quote first to schedule"}
                          onClick={() => { if (q.status === "Locked") { setCalModal(q); setPourDate(""); } }}
                          className={`hidden sm:inline-flex p-1.5 ${q.status === "Locked" ? scheduled.has(q.id) ? "text-green-500" : "text-blue-500 hover:text-blue-700" : "text-gray-300 cursor-default"}`}
                        >
                          <CalendarDays size={14} />
                        </button>

                        <button onClick={() => openEdit(q)} className="p-1.5 text-gray-400 hover:text-orange-500"><Edit2 size={14} /></button>
                        <button onClick={() => deleteQuote(q.id)} className="hidden sm:inline-flex p-1.5 text-gray-400 hover:text-red-500"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>{total} total quotes</span>
          <div className="flex gap-1">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <button onClick={() => setPage(p => p + 1)} disabled={page * limit >= total}
              className="px-3 py-1 border rounded disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        </div>
      </div>

      {/* Quote Modal */}
      {modal !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-4xl my-8">
            <div className="flex items-center justify-between p-6 border-b sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h2 className="text-lg font-bold">
                  {readOnly ? `${(modal as Quote).status} Quote` : modal === "new" ? "New Quote" : "Edit Quote"}
                </h2>
                <div className="text-sm text-gray-500">Quotation: {form.quoteNumber}</div>
              </div>
              <button onClick={() => setModal(null)}><X size={20} /></button>
            </div>

            <div className="p-6 space-y-6">
              {/* Company & Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Submitted To</label>
                  <input
                    disabled={readOnly}
                    value={companySearch}
                    onChange={e => {
                      setCompanySearch(e.target.value);
                      setForm(f => ({ ...f, companyId: undefined }));
                      setCompanyOpen(true);
                    }}
                    onFocus={() => setCompanyOpen(true)}
                    onBlur={() => setTimeout(() => setCompanyOpen(false), 150)}
                    placeholder="Type to search companies…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50"
                  />
                  {companyOpen && companySearch.length > 0 && (() => {
                    const filtered = companies.filter(c => c.name.toLowerCase().includes(companySearch.toLowerCase())).slice(0, 8);
                    if (!filtered.length) return null;
                    return (
                      <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                        {filtered.map(c => (
                          <li key={c.id}
                            onMouseDown={() => {
                              const primary = c.contacts?.find(ct => ct.isPrimary) ?? c.contacts?.[0];
                              setForm(f => ({
                                ...f,
                                companyId: c.id,
                              }));
                              if (primary) setSelectedPersonIds(new Set([primary.id]));
                              setCompanySearch(c.name);
                              setCompanyOpen(false);
                            }}
                            className="px-3 py-2 text-sm cursor-pointer hover:bg-orange-50 hover:text-orange-700"
                          >
                            <div className="font-medium">{c.name}</div>
                            {(c.city || c.province) && <div className="text-xs text-gray-400">{[c.city, c.province].filter(Boolean).join(", ")}</div>}
                          </li>
                        ))}
                      </ul>
                    );
                  })()}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                  <input disabled={readOnly} value={form.authorName || ""} onChange={e => setForm(f => ({ ...f, authorName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50" />
                </div>
              </div>

              {/* Contacts Section */}
              {(() => {
                const selectedCompany = companies.find(c => c.id === form.companyId);
                const allContacts = selectedCompany?.contacts || [];
                return (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-800">Contacts</span>
                      {!readOnly && allContacts.length > 0 && (
                        <button type="button" onClick={() => setContactPickerOpen(v => !v)}
                          className="w-5 h-5 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-orange-500 transition-colors">
                          <Plus size={12} />
                        </button>
                      )}
                      {!readOnly && form.companyId && (
                        <a href={`/contact?company=${form.companyId}`}
                          className="text-xs text-orange-500 hover:text-orange-600 underline"
                          onClick={() => setModal(null)}>
                          + Add Contact
                        </a>
                      )}
                    </div>

                    {/* All-contacts picker — shown when + is clicked */}
                    {contactPickerOpen && allContacts.length > 0 && (
                      <div className="mb-2 border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white">
                        {allContacts.map((ct, i) => {
                          const checked = selectedPersonIds.has(ct.id);
                          return (
                            <div key={ct.id}
                              onClick={() => setSelectedPersonIds(prev => {
                                const n = new Set(prev);
                                if (n.has(ct.id)) n.delete(ct.id); else n.add(ct.id);
                                return n;
                              })}
                              className={`flex items-center gap-3 px-3 py-2 cursor-pointer border-b border-gray-100 last:border-0 transition-colors ${checked ? "bg-orange-50" : "hover:bg-gray-50"}`}>
                              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked ? "bg-orange-500 border-orange-500" : "border-gray-300"}`}>
                                {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 8"><path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                              </div>
                              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                                {ct.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-900">{ct.name}{ct.isPrimary && <span className="ml-1.5 text-xs text-orange-500">Primary</span>}</div>
                                <div className="text-xs text-gray-400 truncate">{[ct.position, ct.email, ct.cell].filter(Boolean).join(" · ")}</div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="px-3 py-2 bg-gray-50 flex justify-end">
                          <button type="button" onClick={() => setContactPickerOpen(false)}
                            className="text-xs font-medium text-gray-600 hover:text-orange-600">Done</button>
                        </div>
                      </div>
                    )}

                    {/* Selected contacts display */}
                    {allContacts.filter(ct => selectedPersonIds.has(ct.id)).length > 0 && !contactPickerOpen && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        {allContacts.filter(ct => selectedPersonIds.has(ct.id)).map((ct, i) => (
                          <div key={ct.id} className={`flex items-center gap-2 px-3 py-2 text-sm ${i > 0 ? "border-t border-gray-100" : ""}`}>
                            <span className="flex-1 font-medium text-gray-900 truncate">{ct.name}</span>
                            <span className="flex-1 text-gray-500 truncate hidden sm:block">{ct.email}</span>
                            <span className="w-32 text-gray-500 truncate hidden md:block">{ct.cell}</span>
                            {!readOnly && (
                              <button type="button"
                                onClick={() => setSelectedPersonIds(prev => { const n = new Set(prev); n.delete(ct.id); return n; })}
                                className="w-5 h-5 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 flex-shrink-0">
                                <X size={10} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Project Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project Name</label>
                  <input disabled={readOnly} value={form.projectName || ""} onChange={e => setForm(f => ({ ...f, projectName: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <input disabled={readOnly} value={form.address || ""} onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input disabled={readOnly} value={form.location || ""} onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Building Type</label>
                  <select disabled={readOnly} value={form.buildingType || ""} onChange={e => setForm(f => ({ ...f, buildingType: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50">
                    <option value="">Select...</option>
                    {BUILDING_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              {/* Specifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contact Method</label>
                <select disabled={readOnly} value={form.contactMethod || "Email"} onChange={e => setForm(f => ({ ...f, contactMethod: e.target.value }))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 disabled:bg-gray-50">
                  {CONTACT_METHODS.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>

              {/* Option Items */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-800">Option Items</h3>
                  {!readOnly && (
                    <button onClick={addItem} className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600">
                      <Plus size={14} /> Add Item
                    </button>
                  )}
                </div>
                {(form.items || []).map((item, i) => (
                  <div key={i} className="border border-gray-200 rounded-xl mb-3 overflow-hidden">
                    <div className="bg-gray-800 text-white px-4 py-2 flex items-center justify-between">
                      <span className="font-mono text-sm">0{i + 1}</span>
                      <div className="flex items-center gap-2">
                        <select disabled={readOnly} value={item.itemType} onChange={e => updateItem(i, "itemType", e.target.value)}
                          className="bg-white text-gray-900 rounded px-2 py-1 text-sm">
                          {["Item", "Allowance", "Option"].map(t => <option key={t}>{t}</option>)}
                        </select>
                        {!readOnly && (
                          <button onClick={() => removeItem(i)} className="text-gray-400 hover:text-red-400"><X size={16} /></button>
                        )}
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                      <div className="col-span-1">
                        <label className="block text-xs text-gray-500 mb-1">Job Type</label>
                        <select disabled={readOnly} value={item.jobType} onChange={e => updateItem(i, "jobType", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50">
                          {JOB_TYPES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Square Footage</label>
                        <input disabled={readOnly} type="number" value={item.squareFootage} onChange={e => updateItem(i, "squareFootage", parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Floors</label>
                        <input disabled={readOnly} value={item.floors} onChange={e => updateItem(i, "floors", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Levels</label>
                        <input disabled={readOnly} type="number" value={item.levels} onChange={e => updateItem(i, "levels", parseInt(e.target.value) || 1)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Mobs</label>
                        <input disabled={readOnly} type="number" value={item.mobs} onChange={e => updateItem(i, "mobs", parseInt(e.target.value) || 1)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Pouring On</label>
                        <select disabled={readOnly} value={item.pouringOn} onChange={e => updateItem(i, "pouringOn", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50">
                          {POURING_OPTIONS.map(o => <option key={o}>{o}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Product 1</label>
                        <select disabled={readOnly} value={item.product1} onChange={e => {
                            updateItem(i, "product1", e.target.value);
                            updateItem(i, "estimateProduct1", e.target.value);
                          }}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50">
                          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Product 2</label>
                        <select disabled={readOnly} value={item.product2} onChange={e => updateItem(i, "product2", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50">
                          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Avg Thickness</label>
                        <select disabled={readOnly} value={item.avgThickness} onChange={e => updateItem(i, "avgThickness", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50">
                          {THICKNESSES.map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Strength (psi)</label>
                        <input disabled={readOnly} type="number" value={item.strengthPsi} onChange={e => updateItem(i, "strengthPsi", parseInt(e.target.value) || 2500)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Project Cost ($)</label>
                        <input disabled={readOnly} type="number" step="0.01" value={item.projectCost} onChange={e => updateItem(i, "projectCost", parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50" />
                      </div>
                      <div className="col-span-1 sm:col-span-2 md:col-span-3 lg:col-span-5">
                        <label className="block text-xs text-gray-500 mb-1">Notes</label>
                        <textarea disabled={readOnly} value={item.notes} onChange={e => updateItem(i, "notes", e.target.value)} rows={2}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Est. Product 1</label>
                        <select disabled={readOnly} value={item.estimateProduct1} onChange={e => updateItem(i, "estimateProduct1", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50">
                          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input disabled={readOnly} type="number" value={item.estimateQty1} onChange={e => updateItem(i, "estimateQty1", parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Est. Product 2</label>
                        <select disabled={readOnly} value={item.estimateProduct2} onChange={e => updateItem(i, "estimateProduct2", e.target.value)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50">
                          {PRODUCTS.map(p => <option key={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Qty</label>
                        <input disabled={readOnly} type="number" value={item.estimateQty2} onChange={e => updateItem(i, "estimateQty2", parseFloat(e.target.value) || 0)}
                          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none disabled:bg-gray-50" />
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center gap-2 text-sm">
                          <input disabled={readOnly} type="checkbox" checked={item.excludeSqFt} onChange={e => updateItem(i, "excludeSqFt", e.target.checked)} />
                          Exclude Sq.Ft
                        </label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Checklist */}
              {checklistItems.length > 0 && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold text-gray-800 mb-3">Quote Details</h3>
                  {SECTIONS.map(section => {
                    const items = checklistItems.filter(ci => ci.section === section);
                    if (items.length === 0 && readOnly) return null;
                    return (
                      <div key={section} className="mb-2 border border-gray-200 rounded-lg overflow-hidden">
                        <div className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 text-sm font-semibold text-gray-800">
                          <span>{SECTION_LABELS[section]}</span>
                          <span className="text-xs font-normal text-gray-400">{items.filter(i => i.checked).length}/{items.length}</span>
                        </div>
                        <div className="p-4 space-y-1">
                            {items.map(ci => (
                              <div key={ci.id} className="flex items-start gap-2 group py-0.5">
                                <input type="checkbox" checked={ci.checked} onChange={() => toggleChecklist(ci.id)}
                                  className="mt-0.5 flex-shrink-0 accent-orange-500 cursor-pointer" />
                                <span className={`flex-1 text-sm ${ci.checked ? "text-gray-800" : "text-gray-400"}`}>{ci.text}</span>
                                {!readOnly && (
                                  <button onClick={() => deleteChecklistItem(ci.id)}
                                    className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0">
                                    <Trash2 size={12} />
                                  </button>
                                )}
                              </div>
                            ))}
                            {!readOnly && (
                              <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                                <input
                                  value={newChecklistText[section] || ""}
                                  onChange={e => setNewChecklistText(prev => ({ ...prev, [section]: e.target.value }))}
                                  onKeyDown={e => e.key === "Enter" && addChecklistItem(section)}
                                  placeholder="Add item…"
                                  className="flex-1 border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-orange-400"
                                />
                                <button onClick={() => addChecklistItem(section)}
                                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-600">
                                  Add
                                </button>
                              </div>
                            )}
                          </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex justify-between gap-3 px-6 py-4 border-t sticky bottom-0 bg-white rounded-b-2xl">
              <button onClick={() => setModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <div className="flex gap-2">
                {!readOnly && (
                  <button onClick={save} disabled={saving}
                    className="px-4 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50">
                    {saving ? "Saving..." : "Save Draft"}
                  </button>
                )}

                {modal !== "new" && (modal as Quote).status === "Locked" && (
                  <button onClick={() => { changeStatus((modal as Quote).id, "finalize"); setModal(null); }}
                    className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Finalize
                  </button>
                )}
                {isLocked && <span className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg font-medium">LOCKED</span>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pour Date Scheduler Modal */}
      {calModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm">
            <div className="flex items-center justify-between p-6 border-b">
              <div>
                <h2 className="text-lg font-bold">Schedule Pour Date</h2>
                <div className="text-sm text-gray-500">{calModal.company?.name || calModal.quoteNumber}</div>
              </div>
              <button onClick={() => setCalModal(null)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select pour date</label>
                <input
                  type="date"
                  value={pourDate}
                  onChange={e => setPourDate(e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-lg focus:outline-none focus:border-orange-500"
                />
              </div>
              {calModal.projectName && (
                <p className="text-sm text-gray-500">Project: <span className="font-medium text-gray-700">{calModal.projectName}</span></p>
              )}
              {calModal.location && (
                <p className="text-sm text-gray-500">Location: <span className="font-medium text-gray-700">{calModal.location}</span></p>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t">
              <button onClick={() => setCalModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button
                onClick={() => schedulePour(calModal, pourDate)}
                disabled={!pourDate}
                className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 flex items-center gap-2"
              >
                <CalendarDays size={16} /> Add to Calendar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
