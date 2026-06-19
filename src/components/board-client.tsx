"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Printer } from "lucide-react";

interface Card {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
}

const GRID = 28;
const snap = (v: number) => Math.round(v / GRID) * GRID;

const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#F97316", "#06B6D4", "#EC4899",
  "#64748B", "#1E293B", "#16A34A", "#DC2626",
];

// Quick-add presets — crew names and common labels
const CREW = ["Dan", "Randy", "Jon", "Ken", "Cody", "Mike", "Tyler", "Ethan"];
const TRUCKS = ["Pump 1", "Pump 2", "Pump 3", "Pump 4", "Small Truck", "Med Truck", "Big Truck", "Kenworth", "FSSO Sand"];
const LABELS = ["OFF", "Intermediate", "On Call"];

export function BoardClient() {
  const [date, setDate] = useState<Date>(() => new Date());
  const [mounted, setMounted] = useState(false);
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const draggingId = useRef<string | null>(null);
  const dragStart = useRef({ mx: 0, my: 0, cx: 0, cy: 0 });
  const savePending = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dateStr = format(date, "yyyy-MM-dd");

  const fetchCards = useCallback(async (ds: string) => {
    setLoading(true);
    const res = await fetch(`/api/simple-board?date=${ds}`);
    const data = await res.json();
    setCards(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchCards(dateStr); }, [dateStr, mounted, fetchCards]);

  // Debounced position save
  function schedulePositionSave(id: string, x: number, y: number) {
    const existing = savePending.current.get(id);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => {
      fetch(`/api/simple-board/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x, y }),
      });
      savePending.current.delete(id);
    }, 400);
    savePending.current.set(id, t);
  }

  // Global drag handlers
  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!draggingId.current) return;
      const cx = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const cy = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const newX = snap(Math.max(0, dragStart.current.cx + cx - dragStart.current.mx));
      const newY = snap(Math.max(0, dragStart.current.cy + cy - dragStart.current.my));
      const id = draggingId.current;
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, x: newX, y: newY } : c))
      );
      schedulePositionSave(id, newX, newY);
    }
    function onUp() { draggingId.current = null; }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove as EventListener, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove as EventListener);
      window.removeEventListener("touchend", onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function startDrag(e: React.MouseEvent | React.TouchEvent, card: Card) {
    if (editingId === card.id) return;
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.tagName === "INPUT") return;
    e.preventDefault();
    const cx = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cy = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    draggingId.current = card.id;
    dragStart.current = { mx: cx, my: cy, cx: card.x, cy: card.y };
    setShowQuickAdd(false);
  }

  async function addCard(label: string, color?: string) {
    const usedColor = color ?? activeColor;
    // Find a free grid position
    const occupied = new Set(cards.map((c) => `${c.x},${c.y}`));
    let x = GRID, y = GRID;
    for (let row = 1; row < 20; row++) {
      for (let col = 1; col < 12; col++) {
        const tx = col * GRID * 5;
        const ty = row * GRID;
        if (!occupied.has(`${tx},${ty}`)) { x = tx; y = ty; break; }
      }
      if (x !== GRID || y !== GRID) break;
    }
    // Simpler: just cascade from top-left
    const offset = cards.length;
    x = snap(28 + (offset % 6) * GRID * 5);
    y = snap(28 + Math.floor(offset / 6) * GRID * 2);

    const res = await fetch("/api/simple-board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, label, color: usedColor, x, y }),
    });
    const card = await res.json();
    setCards((prev) => [...prev, card]);
    if (!label) {
      setEditingId(card.id);
      setEditText("");
    }
  }

  async function deleteCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
    await fetch(`/api/simple-board/${id}`, { method: "DELETE" });
  }

  function beginEdit(card: Card) {
    setEditingId(card.id);
    setEditText(card.label);
  }

  async function commitEdit(id: string) {
    const text = editText.trim();
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, label: text } : c)));
    setEditingId(null);
    await fetch(`/api/simple-board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: text }),
    });
  }

  async function changeColor(id: string, color: string) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, color } : c)));
    await fetch(`/api/simple-board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
  }

  const canvasW = Math.max(1000, ...cards.map((c) => c.x + 160));
  const canvasH = Math.max(600, ...cards.map((c) => c.y + 80));

  if (!mounted) return null;

  return (
    <div
      className="flex flex-col min-h-screen bg-slate-100"
      style={{ userSelect: "none" }}
      onClick={() => { setShowQuickAdd(false); if (editingId) commitEdit(editingId); }}
    >
      {/* ── Toolbar ── */}
      <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center gap-3 flex-wrap print:hidden flex-shrink-0">
        {/* Date navigation */}
        <div className="flex items-center gap-1">
          <button onClick={() => setDate((d) => addDays(d, -1))} className="p-1.5 rounded hover:bg-gray-700 transition-colors">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setDate(new Date())} className="px-2 py-1 rounded hover:bg-gray-700 text-sm font-medium transition-colors">
            Today
          </button>
          <button onClick={() => setDate((d) => addDays(d, 1))} className="p-1.5 rounded hover:bg-gray-700 transition-colors">
            <ChevronRight size={18} />
          </button>
          <span className="ml-2 font-bold text-base">{format(date, "EEEE, MMMM d yyyy")}</span>
        </div>

        <div className="flex-1" />

        {/* Color palette */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setActiveColor(c)}
              title={c}
              className="w-5 h-5 rounded-full transition-transform hover:scale-125 flex-shrink-0"
              style={{
                backgroundColor: c,
                outline: c === activeColor ? "2px solid white" : "2px solid transparent",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>

        {/* Quick add menu */}
        <div className="relative">
          <button
            onClick={(e) => { e.stopPropagation(); setShowQuickAdd((v) => !v); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ backgroundColor: activeColor }}
          >
            <Plus size={15} />
            Add
          </button>

          {showQuickAdd && (
            <div
              className="absolute right-0 top-full mt-2 bg-white text-gray-900 rounded-xl shadow-2xl border border-gray-100 p-3 z-50 w-64"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Blank box */}
              <button
                onClick={() => { addCard(""); setShowQuickAdd(false); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium mb-2 border border-dashed border-gray-300 text-gray-500"
              >
                + Blank box
              </button>

              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Crew</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {CREW.map((name) => (
                  <button
                    key={name}
                    onClick={() => { addCard(name); setShowQuickAdd(false); }}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: activeColor }}
                  >
                    {name}
                  </button>
                ))}
              </div>

              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Trucks</div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {TRUCKS.map((t) => (
                  <button
                    key={t}
                    onClick={() => { addCard(t, "#1E293B"); setShowQuickAdd(false); }}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold text-white bg-gray-800"
                  >
                    {t}
                  </button>
                ))}
              </div>

              <div className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1.5">Labels</div>
              <div className="flex flex-wrap gap-1.5">
                {LABELS.map((l) => (
                  <button
                    key={l}
                    onClick={() => { addCard(l, "#64748B"); setShowQuickAdd(false); }}
                    className="px-2.5 py-1 rounded-full text-xs font-semibold text-white bg-slate-500"
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
        >
          <Printer size={15} />
          Print
        </button>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 overflow-auto">
        <div
          className="relative"
          style={{
            width: canvasW,
            minHeight: canvasH,
            backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
            backgroundSize: `${GRID}px ${GRID}px`,
            backgroundColor: "#f1f5f9",
          }}
          onClick={() => { if (editingId) commitEdit(editingId); }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm">
              Loading…
            </div>
          )}
          {!loading && cards.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm pointer-events-none">
              Click Add → pick crew, trucks, or a blank box to start
            </div>
          )}

          {cards.map((card) => {
            const isEditing = editingId === card.id;
            return (
              <div
                key={card.id}
                className="absolute rounded-md shadow-sm select-none"
                style={{
                  left: card.x,
                  top: card.y,
                  backgroundColor: card.color,
                  minWidth: 80,
                  maxWidth: 200,
                  cursor: isEditing ? "text" : "grab",
                  zIndex: draggingId.current === card.id ? 100 : 1,
                }}
                onMouseDown={(e) => startDrag(e, card)}
                onTouchStart={(e) => startDrag(e, card)}
                onDoubleClick={(e) => { e.stopPropagation(); beginEdit(card); }}
              >
                <div className="flex items-center gap-0.5 px-2 py-1">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onBlur={() => commitEdit(card.id)}
                      onKeyDown={(e) => {
                        e.stopPropagation();
                        if (e.key === "Enter") commitEdit(card.id);
                        if (e.key === "Escape") { setEditingId(null); }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-white/30 text-white placeholder-white/60 rounded px-1 text-sm font-semibold focus:outline-none w-28"
                      placeholder="Type…"
                      style={{ minWidth: 60 }}
                    />
                  ) : (
                    <span className="text-white text-sm font-semibold leading-tight whitespace-nowrap">
                      {card.label || <span className="opacity-40 italic font-normal text-xs">dbl-click</span>}
                    </span>
                  )}

                  {/* Color dot */}
                  <div className="relative ml-1 flex-shrink-0 group">
                    <button
                      title="Change color"
                      onClick={(e) => e.stopPropagation()}
                      className="w-2.5 h-2.5 rounded-full bg-white/40 hover:bg-white/70 transition-colors"
                    />
                    {/* Color picker on hover via CSS group - use a popover instead */}
                    <ColorPicker
                      currentColor={card.color}
                      onChange={(c) => changeColor(card.id, c)}
                    />
                  </div>

                  <button
                    onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }}
                    className="ml-0.5 text-white/50 hover:text-white transition-colors flex-shrink-0"
                  >
                    <X size={11} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white !important; }
        }
      `}</style>
    </div>
  );
}

function ColorPicker({ currentColor, onChange }: { currentColor: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="w-2.5 h-2.5 rounded-full bg-white/40 hover:bg-white/70 transition-colors block"
      />
      {open && (
        <div
          className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50"
          style={{ width: 130 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="grid grid-cols-4 gap-1.5">
            {[
              "#3B82F6","#1D4ED8","#0EA5E9","#06B6D4",
              "#10B981","#16A34A","#84CC16","#EAB308",
              "#F97316","#EF4444","#EC4899","#8B5CF6",
              "#6366F1","#64748B","#1E293B","#78716C",
            ].map((c) => (
              <button
                key={c}
                onClick={() => { onChange(c); setOpen(false); }}
                className="w-7 h-7 rounded-lg border-2 hover:scale-110 transition-transform"
                style={{ backgroundColor: c, borderColor: c === currentColor ? "#111827" : "transparent" }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
