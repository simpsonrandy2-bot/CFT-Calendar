"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Printer } from "lucide-react";

interface Card {
  id: string;
  x: number;
  y: number;
  label: string;
  color: string;
}

const GRID = 28;
const snap = (v: number) => Math.round(v / GRID) * GRID;
const DRAG_THRESHOLD = 6;

const PALETTE = [
  "#3B82F6","#1D4ED8","#0EA5E9","#06B6D4",
  "#10B981","#16A34A","#84CC16","#EAB308",
  "#F97316","#EF4444","#EC4899","#8B5CF6",
  "#6366F1","#64748B","#1E293B","#78716C",
];

// Quick-add presets
const CREW   = ["Dan","Randy","Jon","Ken","Cody","Mike","Tyler","Ethan"];
const TRUCKS = ["Pump 1","Pump 2","Pump 3","Pump 4","Small Truck","Med Truck","Big Truck","Kenworth","FSSO Sand"];
const COMMON = ["OFF","On Call","Intermediate","Flatbed"];

export function BoardClient() {
  const [date, setDate]         = useState<Date>(() => new Date());
  const [mounted, setMounted]   = useState(false);
  const [cards, setCards]       = useState<Card[]>([]);
  const [loading, setLoading]   = useState(true);
  const [activeColor, setActiveColor] = useState(PALETTE[0]);
  const [editingId, setEditingId]     = useState<string | null>(null);
  const [editText, setEditText]       = useState("");
  const [colorPickerId, setColorPickerId] = useState<string | null>(null);

  // Drag tracking
  const dragging   = useRef<{ id: string; startMx: number; startMy: number; startCx: number; startCy: number } | null>(null);
  const didDrag    = useRef(false);
  const savePending = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const canvasRef  = useRef<HTMLDivElement>(null);

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

  function scheduleSave(id: string, x: number, y: number) {
    const t = savePending.current.get(id);
    if (t) clearTimeout(t);
    savePending.current.set(id, setTimeout(() => {
      fetch(`/api/simple-board/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ x, y }),
      });
    }, 400));
  }

  // Global mouse/touch move + up
  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!dragging.current) return;
      const cx = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const cy = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const dx = cx - dragging.current.startMx;
      const dy = cy - dragging.current.startMy;
      if (!didDrag.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      didDrag.current = true;
      const newX = snap(Math.max(0, dragging.current.startCx + dx));
      const newY = snap(Math.max(0, dragging.current.startCy + dy));
      const id = dragging.current.id;
      setCards(prev => prev.map(c => c.id === id ? { ...c, x: newX, y: newY } : c));
      scheduleSave(id, newX, newY);
    }
    function onUp() {
      dragging.current = null;
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove as EventListener, { passive: false });
    window.addEventListener("touchend",  onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove as EventListener);
      window.removeEventListener("touchend",  onUp);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target !== canvasRef.current) return;
    setColorPickerId(null);
    setEditingId(null);
  }

  async function createCard(label: string, color: string, x: number, y: number) {
    const res = await fetch("/api/simple-board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, label, color, x, y }),
    });
    const card = await res.json();
    setCards(prev => [...prev, card]);
    setEditingId(card.id);
    setEditText(label);
  }

  async function quickAdd(label: string, color: string) {
    // Place near other cards in a loose grid
    const n = cards.length;
    const x = snap(GRID + (n % 7) * GRID * 5);
    const y = snap(GRID + Math.floor(n / 7) * GRID * 2);
    await createCard(label, color, x, y);
  }

  function startDrag(e: React.MouseEvent | React.TouchEvent, card: Card) {
    const target = e.target as HTMLElement;
    if (["BUTTON","INPUT"].includes(target.tagName)) return;
    const cx = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cy = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    dragging.current = { id: card.id, startMx: cx, startMy: cy, startCx: card.x, startCy: card.y };
    didDrag.current = false;
  }

  function onCardMouseUp(card: Card) {
    if (!didDrag.current) {
      // It was a tap/click — open edit
      setEditingId(card.id);
      setEditText(card.label);
      setColorPickerId(null);
    }
  }

  async function commitEdit(id: string) {
    const text = editText.trim();
    setCards(prev => prev.map(c => c.id === id ? { ...c, label: text } : c));
    setEditingId(null);
    await fetch(`/api/simple-board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ label: text }),
    });
  }

  async function changeColor(id: string, color: string) {
    setCards(prev => prev.map(c => c.id === id ? { ...c, color } : c));
    setColorPickerId(null);
    await fetch(`/api/simple-board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ color }),
    });
  }

  async function deleteCard(id: string) {
    if (editingId === id) setEditingId(null);
    setCards(prev => prev.filter(c => c.id !== id));
    await fetch(`/api/simple-board/${id}`, { method: "DELETE" });
  }

  const canvasW = Math.max(1000, ...cards.map(c => c.x + 220));
  const canvasH = Math.max(600,  ...cards.map(c => c.y + 100));

  if (!mounted) return null;

  return (
    <div className="flex flex-col min-h-screen bg-slate-100" style={{ userSelect: "none" }}>

      {/* ── Toolbar ── */}
      <div className="bg-gray-900 text-white px-4 py-2.5 flex items-center gap-3 flex-wrap print:hidden">

        {/* Date nav */}
        <button onClick={() => setDate(d => addDays(d,-1))} className="p-1.5 rounded hover:bg-gray-700"><ChevronLeft size={18}/></button>
        <button onClick={() => setDate(new Date())} className="px-2 py-1 rounded hover:bg-gray-700 text-sm font-medium">Today</button>
        <button onClick={() => setDate(d => addDays(d, 1))} className="p-1.5 rounded hover:bg-gray-700"><ChevronRight size={18}/></button>
        <span className="font-bold text-base">{format(date,"EEEE, MMMM d yyyy")}</span>

        <div className="flex-1"/>

        {/* Active color palette */}
        <div className="flex items-center gap-1 flex-wrap">
          {PALETTE.map(c => (
            <button
              key={c}
              onClick={() => setActiveColor(c)}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110 flex-shrink-0"
              style={{ backgroundColor: c, outline: c === activeColor ? "2px solid white" : "2px solid transparent", outlineOffset: 2 }}
            />
          ))}
        </div>

        {/* Print */}
        <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium">
          <Printer size={15}/> Print
        </button>
      </div>

      {/* ── Quick-add strips ── */}
      <div className="bg-gray-800 text-white px-4 py-2 flex items-center gap-2 flex-wrap text-xs print:hidden">
        <span className="text-gray-400 font-semibold uppercase tracking-wide mr-1">Crew</span>
        {CREW.map(name => (
          <button key={name} onClick={() => quickAdd(name, activeColor)}
            className="px-2.5 py-1 rounded-full font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: activeColor }}>
            {name}
          </button>
        ))}
        <span className="text-gray-500 mx-1">|</span>
        <span className="text-gray-400 font-semibold uppercase tracking-wide mr-1">Trucks</span>
        {TRUCKS.map(t => (
          <button key={t} onClick={() => quickAdd(t, "#1E293B")}
            className="px-2.5 py-1 rounded-full font-semibold bg-slate-600 hover:bg-slate-500 transition-colors">
            {t}
          </button>
        ))}
        <span className="text-gray-500 mx-1">|</span>
        {COMMON.map(l => (
          <button key={l} onClick={() => quickAdd(l, "#64748B")}
            className="px-2.5 py-1 rounded-full font-semibold bg-slate-500 hover:bg-slate-400 transition-colors">
            {l}
          </button>
        ))}
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 overflow-auto">
        <div
          ref={canvasRef}
          className="relative"
          style={{
            width: canvasW, minHeight: canvasH,
            backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
            backgroundSize: `${GRID}px ${GRID}px`,
            backgroundColor: "#f1f5f9",
            cursor: "default",
          }}
          onClick={onCanvasClick}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-slate-400 text-sm animate-pulse">
              Loading…
            </div>
          )}
          {!loading && cards.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 text-sm pointer-events-none">
              <div>Use the crew, truck, and label buttons above to build your schedule</div>
            </div>
          )}

          {cards.map(card => {
            const isEditing = editingId === card.id;
            const isColorOpen = colorPickerId === card.id;

            return (
              <div
                key={card.id}
                className="absolute group rounded-lg shadow-md"
                style={{
                  left: card.x, top: card.y,
                  backgroundColor: card.color,
                  zIndex: dragging.current?.id === card.id ? 100 : isEditing ? 50 : 1,
                  cursor: isEditing ? "text" : "grab",
                  minWidth: 80,
                }}
                onMouseDown={e => startDrag(e, card)}
                onMouseUp={() => onCardMouseUp(card)}
                onTouchStart={e => startDrag(e, card)}
                onTouchEnd={() => onCardMouseUp(card)}
              >
                <div className="flex items-center gap-1 px-2.5 py-1.5">
                  {isEditing ? (
                    <input
                      autoFocus
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onBlur={() => commitEdit(card.id)}
                      onKeyDown={e => {
                        e.stopPropagation();
                        if (e.key === "Enter" || e.key === "Tab") commitEdit(card.id);
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={e => e.stopPropagation()}
                      className="bg-white/30 text-white placeholder-white/60 rounded px-1.5 text-sm font-semibold focus:outline-none"
                      style={{ minWidth: 80, width: Math.max(80, editText.length * 9) }}
                      placeholder="Type label…"
                    />
                  ) : (
                    <span className="text-white text-sm font-semibold whitespace-nowrap leading-tight">
                      {card.label || <span className="opacity-40 font-normal italic text-xs">empty</span>}
                    </span>
                  )}

                  {/* Color swatch — visible on hover */}
                  <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onMouseDown={e => e.stopPropagation()}
                      onClick={e => { e.stopPropagation(); setColorPickerId(isColorOpen ? null : card.id); }}
                      className="w-3.5 h-3.5 rounded-full border-2 border-white/70 hover:border-white transition-colors block flex-shrink-0"
                      style={{ backgroundColor: card.color }}
                      title="Change color"
                    />
                    {isColorOpen && (
                      <div
                        className="absolute left-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl p-2 z-50"
                        style={{ width: 144 }}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                      >
                        <div className="grid grid-cols-4 gap-1.5">
                          {PALETTE.map(c => (
                            <button
                              key={c}
                              onClick={() => changeColor(card.id, c)}
                              className="w-7 h-7 rounded-lg border-2 hover:scale-110 transition-transform"
                              style={{ backgroundColor: c, borderColor: c === card.color ? "#111827" : "transparent" }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Delete — visible on hover */}
                  <button
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); deleteCard(card.id); }}
                    className="text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <style>{`@media print { .print\\:hidden { display:none!important; } body { background:white!important; } }`}</style>
    </div>
  );
}
