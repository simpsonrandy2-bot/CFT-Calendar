"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, X, ChevronDown, ChevronRight, Save } from "lucide-react";

interface TemplateItem {
  id?: string;
  section: string;
  text: string;
  checked: boolean;
  sortOrder: number;
}

interface Template {
  id: string;
  name: string;
  items: TemplateItem[];
}

const SECTIONS = ["jobDetails", "scopeOfWork", "provisions", "exclusions", "miscCharges", "terms"];
const SECTION_LABELS: Record<string, string> = {
  jobDetails: "Job Details",
  scopeOfWork: "Scope of Work",
  provisions: "Provisions by GC / Owner / Builder",
  exclusions: "Exclusions",
  miscCharges: "Miscellaneous Charges",
  terms: "Terms",
};

const PRODUCTS = [
  "Default",
  "LR 2500", "LR 3500", "LR 4500", "LR3500 FR",
  "Maxxon Gyp-Crete High Performance", "Maxxon MF",
  "Maxxon Commercial Pro Level-Crete", "EXP Topping", "Quik-Top",
];

export function TemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [editItems, setEditItems] = useState<TemplateItem[]>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(SECTIONS));
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [newText, setNewText] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/checklist-templates");
    setTemplates(await res.json());
  }, []);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);

  function selectTemplate(t: Template) {
    setSelected(t);
    setEditItems(t.items.map(i => ({ ...i })));
    setDirty(false);
  }

  function toggleSection(s: string) {
    setOpenSections(prev => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }

  function toggleItem(idx: number) {
    setEditItems(prev => prev.map((item, i) => i === idx ? { ...item, checked: !item.checked } : item));
    setDirty(true);
  }

  function deleteItem(idx: number) {
    setEditItems(prev => prev.filter((_, i) => i !== idx));
    setDirty(true);
  }

  function addItem(section: string) {
    const text = newText[section]?.trim();
    if (!text) return;
    const sectionItems = editItems.filter(i => i.section === section);
    setEditItems(prev => [...prev, { section, text, checked: false, sortOrder: sectionItems.length }]);
    setNewText(prev => ({ ...prev, [section]: "" }));
    setDirty(true);
  }

  async function save() {
    if (!selected) return;
    setSaving(true);
    const res = await fetch(`/api/checklist-templates/${selected.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: selected.name, items: editItems }),
    });
    const updated = await res.json();
    setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
    setSelected(updated);
    setEditItems(updated.items.map((i: TemplateItem) => ({ ...i })));
    setDirty(false);
    setSaving(false);
  }

  async function createTemplate() {
    if (!newName.trim()) return;
    const res = await fetch("/api/checklist-templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newName.trim(), items: [] }),
    });
    const t = await res.json();
    setTemplates(prev => [...prev, t]);
    selectTemplate(t);
    setNewName("");
    setShowNew(false);
  }

  async function deleteTemplate(id: string) {
    if (!confirm("Delete this template?")) return;
    await fetch(`/api/checklist-templates/${id}`, { method: "DELETE" });
    setTemplates(prev => prev.filter(t => t.id !== id));
    if (selected?.id === id) { setSelected(null); setEditItems([]); }
  }

  const itemsBySection = (section: string) => editItems.filter(i => i.section === section);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Configure default checklist items per product. Applied automatically when creating a new quote.</p>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar — template list */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Templates</span>
              <button onClick={() => setShowNew(true)} className="p-1 text-gray-400 hover:text-orange-500"><Plus size={14} /></button>
            </div>
            {showNew && (
              <div className="p-2 border-b border-gray-100 flex gap-1">
                <select
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="flex-1 border border-gray-300 rounded px-1.5 py-1 text-xs focus:outline-none"
                >
                  <option value="">Pick product…</option>
                  {PRODUCTS.filter(p => !templates.find(t => t.name === p)).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                <button onClick={createTemplate} className="px-2 py-1 bg-orange-500 text-white rounded text-xs">Add</button>
                <button onClick={() => { setShowNew(false); setNewName(""); }}><X size={14} className="text-gray-400" /></button>
              </div>
            )}
            {templates.length === 0 && (
              <p className="px-3 py-4 text-xs text-gray-400">No templates yet. Click + to create one.</p>
            )}
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-gray-50 last:border-0 group ${selected?.id === t.id ? "bg-orange-50 border-l-2 border-l-orange-500" : "hover:bg-gray-50"}`}
              >
                <span className="text-sm font-medium text-gray-800 truncate">{t.name}</span>
                <button
                  onClick={e => { e.stopPropagation(); deleteTemplate(t.id); }}
                  className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100"
                ><Trash2 size={12} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Main — template editor */}
        {selected ? (
          <div className="flex-1">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <h2 className="font-bold text-gray-900">{selected.name}</h2>
                <button
                  onClick={save}
                  disabled={!dirty || saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-40"
                >
                  <Save size={14} /> {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>

              <div className="p-5 space-y-3">
                {SECTIONS.map(section => {
                  const items = itemsBySection(section);
                  const open = openSections.has(section);
                  return (
                    <div key={section} className="border border-gray-200 rounded-lg overflow-hidden">
                      <button
                        onClick={() => toggleSection(section)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 text-sm font-semibold text-gray-700"
                      >
                        <span>{SECTION_LABELS[section]}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-normal text-gray-400">{items.filter(i => i.checked).length}/{items.length} checked</span>
                          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      </button>

                      {open && (
                        <div className="p-3 space-y-1">
                          {items.map((item) => {
                            const idx = editItems.indexOf(item);
                            return (
                              <div key={idx} className="flex items-start gap-2 group py-1">
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={() => toggleItem(idx)}
                                  className="mt-0.5 accent-orange-500 cursor-pointer"
                                />
                                <span className={`flex-1 text-sm ${item.checked ? "text-gray-900" : "text-gray-500"}`}>{item.text}</span>
                                <button
                                  onClick={() => deleteItem(idx)}
                                  className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0"
                                ><Trash2 size={12} /></button>
                              </div>
                            );
                          })}
                          {items.length === 0 && (
                            <p className="text-xs text-gray-400 py-1">No items in this section.</p>
                          )}
                          {/* Add new item */}
                          <div className="flex gap-2 mt-2 pt-2 border-t border-gray-100">
                            <input
                              value={newText[section] || ""}
                              onChange={e => setNewText(prev => ({ ...prev, [section]: e.target.value }))}
                              onKeyDown={e => e.key === "Enter" && addItem(section)}
                              placeholder="Add item…"
                              className="flex-1 border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-orange-400"
                            />
                            <button
                              onClick={() => addItem(section)}
                              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded text-sm font-medium text-gray-600"
                            >Add</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a template to edit, or create a new one.
          </div>
        )}
      </div>
    </div>
  );
}
