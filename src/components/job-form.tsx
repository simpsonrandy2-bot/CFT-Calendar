"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEFAULT_CREW_MEMBERS, DEFAULT_JOB_TYPES } from "@/lib/utils";

interface JobFormProps {
  initialData?: {
    id?: string;
    jobNumber?: string;
    title?: string;
    customer?: string;
    jobType?: string;
    address?: string;
    jobLead?: string;
    siteContact?: string;
    startDate?: string;
    endDate?: string;
    startTime?: string;
    description?: string;
    colorTag?: string;
    legacyJobUrl?: string;
  };
  mode: "create" | "edit";
}

const COLORS = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6B7280",
];

export function JobForm({ initialData, mode }: JobFormProps) {
  const router = useRouter();
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    jobNumber: initialData?.jobNumber || "",
    title: initialData?.title || "",
    customer: initialData?.customer || "",
    jobType: initialData?.jobType || "",
    address: initialData?.address || "",
    jobLead: initialData?.jobLead || "",
    siteContact: initialData?.siteContact || "",
    startDate: initialData?.startDate?.split("T")[0] || today,
    endDate: initialData?.endDate?.split("T")[0] || today,
    startTime: initialData?.startTime || "",
    description: initialData?.description || "",
    colorTag: initialData?.colorTag || "#3B82F6",
    legacyJobUrl: initialData?.legacyJobUrl || "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const url = mode === "create" ? "/api/jobs" : `/api/jobs/${initialData?.id}`;
    const method = mode === "create" ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      const job = await res.json();
      router.push(`/jobs/${job.id}`);
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error || "Failed to save job");
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Delete this job? This cannot be undone.")) return;
    const res = await fetch(`/api/jobs/${initialData?.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/jobs");
      router.refresh();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Number</label>
          <input
            value={form.jobNumber}
            onChange={(e) => set("jobNumber", e.target.value)}
            placeholder="25-674"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
          <input
            value={form.jobType}
            onChange={(e) => set("jobType", e.target.value)}
            list="job-types"
            placeholder="Precast, Wood Fr..."
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <datalist id="job-types">
            {DEFAULT_JOB_TYPES.map((t) => <option key={t} value={t} />)}
          </datalist>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
        <input
          required
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Precast 55,650 sf 1/2 LR 2500"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
        <input
          value={form.customer}
          onChange={(e) => set("customer", e.target.value)}
          placeholder="Customer name"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
        <input
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="123 Industrial Rd, City, Province"
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Job Lead</label>
          <select
            value={form.jobLead}
            onChange={(e) => set("jobLead", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
          >
            <option value="">Select Lead</option>
            {DEFAULT_CREW_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Site Contact</label>
          <input
            value={form.siteContact}
            onChange={(e) => set("siteContact", e.target.value)}
            placeholder="Name + phone"
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date *</label>
          <input
            required
            type="date"
            value={form.startDate}
            onChange={(e) => set("startDate", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date *</label>
          <input
            required
            type="date"
            value={form.endDate}
            min={form.startDate}
            onChange={(e) => set("endDate", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => set("startTime", e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description / Notes</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={6}
          placeholder="Floor breakdowns, special instructions, material notes..."
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Color Tag</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => set("colorTag", color)}
              className="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110"
              style={{
                backgroundColor: color,
                borderColor: form.colorTag === color ? "#111" : "transparent",
                transform: form.colorTag === color ? "scale(1.2)" : undefined,
              }}
            />
          ))}
          <input
            type="color"
            value={form.colorTag}
            onChange={(e) => set("colorTag", e.target.value)}
            className="w-8 h-8 rounded-full cursor-pointer border border-gray-300"
            title="Custom color"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Legacy Job URL</label>
        <input
          type="url"
          value={form.legacyJobUrl}
          onChange={(e) => set("legacyJobUrl", e.target.value)}
          placeholder="https://..."
          className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : mode === "create" ? "Create Job" : "Save Changes"}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
        >
          Cancel
        </button>
        {mode === "edit" && (
          <button
            type="button"
            onClick={handleDelete}
            className="ml-auto px-6 py-3 bg-red-50 text-red-600 rounded-xl font-semibold hover:bg-red-100 transition-colors"
          >
            Delete Job
          </button>
        )}
      </div>
    </form>
  );
}
