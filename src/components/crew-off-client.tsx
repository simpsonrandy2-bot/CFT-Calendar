"use client";

import { useEffect, useState } from "react";
import { formatDateRange, DEFAULT_CREW_MEMBERS } from "@/lib/utils";
import { Plus, Trash2 } from "lucide-react";

interface CrewOff {
  id: string;
  crewName: string;
  startDate: string;
  endDate: string;
  note: string;
}

export function CrewOffClient() {
  const [entries, setEntries] = useState<CrewOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ crewName: "", startDate: today, endDate: today, note: "" });

  useEffect(() => {
    fetch("/api/crew-off")
      .then((r) => r.json())
      .then((data) => { setEntries(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/crew-off", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const entry = await res.json();
      setEntries((prev) => [...prev, entry].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      setShowForm(false);
      setForm({ crewName: "", startDate: today, endDate: today, note: "" });
    }
  }

  async function handleDelete(id: string) {
    const res = await fetch("/api/crew-off", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (res.ok) {
      setEntries((prev) => prev.filter((e) => e.id !== id));
    }
  }

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-gray-900">Crew Off Days</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition-colors"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-white rounded-xl border border-gray-200 p-4 mb-4 space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Crew Member</label>
            <select
              required
              value={form.crewName}
              onChange={(e) => setForm({ ...form, crewName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white"
            >
              <option value="">— Select —</option>
              {DEFAULT_CREW_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
              <input
                required
                type="date"
                value={form.endDate}
                min={form.startDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
            <input
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              placeholder="Vacation, sick, etc."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
              Save
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-center text-gray-400 py-12">No crew off days scheduled</p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <div key={entry.id} className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3">
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{entry.crewName}</p>
                <p className="text-sm text-gray-500">{formatDateRange(entry.startDate, entry.endDate)}</p>
                {entry.note && <p className="text-xs text-gray-400 mt-0.5">{entry.note}</p>}
              </div>
              <button
                onClick={() => handleDelete(entry.id)}
                className="p-2 text-gray-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
