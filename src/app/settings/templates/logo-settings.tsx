"use client";

import { useState, useEffect, useRef } from "react";
import { Upload, Save, X } from "lucide-react";

interface Settings {
  logoData?: string;
  companyName?: string;
  tagline?: string;
  phone?: string;
  email?: string;
}

export function LogoSettings() {
  const [settings, setSettings] = useState<Settings>({});
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings").then(r => r.json()).then(setSettings);
  }, []);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) { alert("Logo must be under 500 KB"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setSettings(s => ({ ...s, logoData: reader.result as string }));
      setDirty(true);
    };
    reader.readAsDataURL(file);
  }

  function update(field: keyof Settings, value: string) {
    setSettings(s => ({ ...s, [field]: value }));
    setDirty(true);
  }

  async function save() {
    setSaving(true);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      setDirty(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div>
          <h2 className="font-bold text-gray-900">Company Settings</h2>
          <p className="text-xs text-gray-400 mt-0.5">Logo and company info shown on quote PDFs</p>
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className="flex items-center gap-1.5 px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-40"
        >
          <Save size={14} /> {saving ? "Saving…" : "Save"}
        </button>
      </div>

      <div className="p-5 flex gap-6 items-start">
        {/* Logo upload */}
        <div className="flex-shrink-0">
          <p className="text-xs font-medium text-gray-500 mb-2">Logo</p>
          <div
            onClick={() => fileRef.current?.click()}
            className="w-40 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-orange-400 hover:bg-orange-50 transition-colors overflow-hidden relative group"
          >
            {settings.logoData ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={settings.logoData} alt="Logo" className="max-w-full max-h-full object-contain p-2" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <span className="text-white text-xs font-medium">Change</span>
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400">
                <Upload size={20} className="mx-auto mb-1" />
                <span className="text-xs">Upload logo</span>
              </div>
            )}
          </div>
          {settings.logoData && (
            <button
              onClick={() => { setSettings(s => ({ ...s, logoData: undefined })); setDirty(true); }}
              className="mt-1 text-xs text-red-400 hover:text-red-600 flex items-center gap-1"
            >
              <X size={11} /> Remove
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
          <p className="text-xs text-gray-400 mt-1">PNG, JPG · max 500 KB</p>
        </div>

        {/* Company fields */}
        <div className="flex-1 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Company Name</label>
            <input value={settings.companyName || ""} onChange={e => update("companyName", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Tagline</label>
            <input value={settings.tagline || ""} onChange={e => update("tagline", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Phone</label>
            <input value={settings.phone || ""} onChange={e => update("phone", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Email</label>
            <input value={settings.email || ""} onChange={e => update("email", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-orange-400" />
          </div>
        </div>
      </div>
    </div>
  );
}
