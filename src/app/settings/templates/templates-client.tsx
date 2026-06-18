"use client";

import { useState, useEffect, useCallback } from "react";
import { Trash2, X, ChevronDown, ChevronRight, Save, RefreshCw } from "lucide-react";

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

export function TemplatesClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selected, setSelected] = useState<Template | null>(null);
  const [editItems, setEditItems] = useState<TemplateItem[]>([]);
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(SECTIONS));
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [newText, setNewText] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const fetchTemplates = useCallback(async () => {
    const res = await fetch("/api/checklist-templates");
    const data = await res.json();
    setTemplates(data);
    return data as Template[];
  }, []);

  useEffect(() => {
    fetchTemplates().then(data => {
      // Auto-seed if no templates exist yet
      if (data.length === 0) seedTemplates(true);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function seedTemplates(silent = false) {
    if (!silent && !confirm("This will create any missing templates pre-populated with the standard checklist. Existing templates will not be changed.")) return;
    setSeeding(true);
    await fetch("/api/admin/seed-templates", { method: "POST" });
    const data = await fetchTemplates();
    if (data.length > 0 && !selected) selectTemplate(data[0]);
    setSeeding(false);
  }

  function selectTemplate(t: Template) {
    setSelected(t);
    setEditItems(t.items.map(i => ({ ...i })));
    setDirty(false);
    setNewText({});
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

  const itemsBySection = (section: string) => editItems.filter(i => i.section === section);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Checklist Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Default checklist items per product — applied automatically when creating a new quote.</p>
        </div>
        <button
          onClick={() => seedTemplates()}
          disabled={seeding}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw size={14} className={seeding ? "animate-spin" : ""} />
          {seeding ? "Creating…" : "Reset Missing Templates"}
        </button>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-3 py-2 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Templates</span>
            </div>
            {templates.length === 0 && (
              <p className="px-3 py-4 text-xs text-gray-400">Loading templates…</p>
            )}
            {templates.map(t => (
              <div
                key={t.id}
                onClick={() => selectTemplate(t)}
                className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-gray-50 last:border-0 ${selected?.id === t.id ? "bg-orange-50 border-l-2 border-l-orange-500" : "hover:bg-gray-50"}`}
              >
                <span className="text-sm font-medium text-gray-800 truncate">{t.name}</span>
                {selected?.id === t.id && dirty && (
                  <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Editor */}
        {selected ? (
          <div className="flex-1">
            <div className="bg-white rounded-xl border border-gray-200">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div>
                  <h2 className="font-bold text-gray-900">{selected.name}</h2>
                  <p className="text-xs text-gray-400 mt-0.5">{editItems.filter(i => i.checked).length} of {editItems.length} items checked by default</p>
                </div>
                <button
                  onClick={save}
                  disabled={!dirty || saving}
                  className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-40"
                >
                  <Save size={14} /> {saving ? "Saving…" : "Save Template"}
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
                          <span className="text-xs font-normal text-gray-400">{items.filter(i => i.checked).length}/{items.length} on by default</span>
                          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </div>
                      </button>

                      {open && (
                        <div className="p-3 space-y-0.5">
                          {items.map((item) => {
                            const idx = editItems.indexOf(item);
                            return (
                              <div key={idx} className="flex items-start gap-2 group py-1.5 border-b border-gray-50 last:border-0">
                                <input
                                  type="checkbox"
                                  checked={item.checked}
                                  onChange={() => toggleItem(idx)}
                                  className="mt-0.5 accent-orange-500 cursor-pointer flex-shrink-0"
                                />
                                <span className={`flex-1 text-sm leading-snug ${item.checked ? "text-gray-900" : "text-gray-400"}`}>{item.text}</span>
                                <button
                                  onClick={() => deleteItem(idx)}
                                  className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 flex-shrink-0 mt-0.5"
                                  title="Remove item"
                                ><Trash2 size={12} /></button>
                              </div>
                            );
                          })}
                          {items.length === 0 && (
                            <p className="text-xs text-gray-400 py-2 text-center">No items — add one below.</p>
                          )}
                          <div className="flex gap-2 mt-3 pt-2 border-t border-gray-100">
                            <input
                              value={newText[section] || ""}
                              onChange={e => setNewText(prev => ({ ...prev, [section]: e.target.value }))}
                              onKeyDown={e => e.key === "Enter" && addItem(section)}
                              placeholder="Add custom item… (Enter to add)"
                              className="flex-1 border border-gray-200 rounded px-2.5 py-1.5 text-sm focus:outline-none focus:border-orange-400"
                            />
                            <button
                              onClick={() => addItem(section)}
                              disabled={!newText[section]?.trim()}
                              className="px-3 py-1.5 bg-orange-500 text-white rounded text-sm font-medium hover:bg-orange-600 disabled:opacity-40"
                            >
                              Add
                            </button>
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
          <div className="flex-1 flex items-center justify-center">
            {seeding ? (
              <div className="text-center text-gray-400">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2" />
                <p className="text-sm">Creating templates…</p>
              </div>
            ) : (
              <p className="text-gray-400 text-sm">Select a template from the list to edit it.</p>
            )}
          </div>
        )}
      </div>

      {/* Unsaved changes warning */}
      {dirty && (
        <div className="fixed bottom-4 right-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg shadow-lg flex items-center gap-3">
          <span>Unsaved changes</span>
          <button onClick={save} className="bg-orange-500 hover:bg-orange-600 px-3 py-1 rounded text-xs font-semibold">Save</button>
          <button onClick={() => { if (selected) selectTemplate(selected); }} className="text-gray-400 hover:text-white"><X size={14} /></button>
        </div>
      )}
    </div>
  );
}
