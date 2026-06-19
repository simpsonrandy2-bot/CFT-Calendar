"use client";

import { useEffect, useState, useRef } from "react";
import { format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Printer } from "lucide-react";

interface Card {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

const COLORS = [
  "#3B82F6", "#10B981", "#F59E0B", "#EF4444",
  "#8B5CF6", "#F97316", "#06B6D4", "#EC4899",
  "#64748B", "#1E293B", "#16A34A", "#DC2626",
];

function storageKey(date: string) {
  return `cft-board-${date}`;
}

function loadCards(date: string): Card[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(date));
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveCards(date: string, cards: Card[]) {
  localStorage.setItem(storageKey(date), JSON.stringify(cards));
}

export default function BoardPage() {
  const [date, setDate] = useState(() => new Date());
  const [cards, setCards] = useState<Card[]>([]);
  const [mounted, setMounted] = useState(false);
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const draggingId = useRef<string | null>(null);
  const dragStart = useRef({ mx: 0, my: 0, cx: 0, cy: 0 });

  const dateStr = format(date, "yyyy-MM-dd");
  const dayLabel = format(date, "EEEE, MMMM d yyyy");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) setCards(loadCards(dateStr));
  }, [dateStr, mounted]);

  useEffect(() => {
    if (mounted) saveCards(dateStr, cards);
  }, [cards, dateStr, mounted]);

  // Global mouse handlers for drag
  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!draggingId.current) return;
      const cx = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const cy = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const dx = cx - dragStart.current.mx;
      const dy = cy - dragStart.current.my;
      setCards((prev) =>
        prev.map((c) =>
          c.id === draggingId.current
            ? { ...c, x: Math.max(0, dragStart.current.cx + dx), y: Math.max(0, dragStart.current.cy + dy) }
            : c
        )
      );
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
  }, []);

  function startDrag(e: React.MouseEvent | React.TouchEvent, card: Card) {
    const target = e.target as HTMLElement;
    if (target.tagName === "BUTTON" || target.tagName === "TEXTAREA") return;
    e.preventDefault();
    const cx = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const cy = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    draggingId.current = card.id;
    dragStart.current = { mx: cx, my: cy, cx: card.x, cy: card.y };
  }

  function addCard() {
    const id = crypto.randomUUID();
    const offset = cards.length;
    const card: Card = {
      id,
      x: 24 + (offset % 6) * 160,
      y: 24 + Math.floor(offset / 6) * 80,
      text: "",
      color: activeColor,
    };
    setCards((prev) => [...prev, card]);
    setEditingId(id);
  }

  function updateText(id: string, text: string) {
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, text } : c)));
  }

  function deleteCard(id: string) {
    setCards((prev) => prev.filter((c) => c.id !== id));
  }

  const canvasW = Math.max(900, ...cards.map((c) => c.x + 160));
  const canvasH = Math.max(500, ...cards.map((c) => c.y + 100));

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col" style={{ userSelect: "none" }}>
      {/* Toolbar */}
      <div className="bg-gray-900 text-white px-4 py-3 flex items-center gap-4 flex-wrap flex-shrink-0 print:hidden">
        {/* Date nav */}
        <div className="flex items-center gap-1">
          <button onClick={() => setDate((d) => addDays(d, -1))} className="p-1.5 rounded hover:bg-gray-700">
            <ChevronLeft size={18} />
          </button>
          <button onClick={() => setDate(new Date())} className="px-2 py-1 rounded hover:bg-gray-700 text-sm">
            Today
          </button>
          <button onClick={() => setDate((d) => addDays(d, 1))} className="p-1.5 rounded hover:bg-gray-700">
            <ChevronRight size={18} />
          </button>
          <span className="ml-2 font-bold text-lg">{dayLabel}</span>
        </div>

        <div className="flex-1" />

        {/* Color swatches */}
        <div className="flex items-center gap-1.5">
          {COLORS.map((c) => (
            <button
              key={c}
              onClick={() => setActiveColor(c)}
              className="w-6 h-6 rounded-full transition-transform hover:scale-110"
              style={{
                backgroundColor: c,
                outline: c === activeColor ? "3px solid white" : "2px solid transparent",
                outlineOffset: "2px",
              }}
            />
          ))}
        </div>

        {/* Add */}
        <button
          onClick={addCard}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: activeColor }}
        >
          <Plus size={15} />
          Add Box
        </button>

        {/* Print */}
        <button
          onClick={() => window.print()}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors"
        >
          <Printer size={15} />
          Print
        </button>
      </div>

      {/* Canvas */}
      <div className="flex-1 overflow-auto">
        <div
          className="relative"
          style={{
            width: canvasW,
            minHeight: canvasH,
            backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            backgroundColor: "#f1f5f9",
          }}
          onClick={() => setEditingId(null)}
        >
          {cards.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-400 text-sm">Pick a color and click "Add Box" to start building your schedule</p>
            </div>
          )}

          {cards.map((card) => (
            <div
              key={card.id}
              className="absolute rounded-lg shadow cursor-grab active:cursor-grabbing"
              style={{
                left: card.x,
                top: card.y,
                backgroundColor: card.color,
                minWidth: 100,
                maxWidth: 200,
                zIndex: draggingId.current === card.id ? 100 : 1,
              }}
              onMouseDown={(e) => startDrag(e, card)}
              onTouchStart={(e) => startDrag(e, card)}
            >
              <div className="flex items-start p-1.5 gap-1">
                {editingId === card.id ? (
                  <textarea
                    autoFocus
                    value={card.text}
                    onChange={(e) => updateText(card.id, e.target.value)}
                    onBlur={() => setEditingId(null)}
                    onClick={(e) => e.stopPropagation()}
                    rows={1}
                    className="flex-1 bg-white/30 text-white placeholder-white/70 rounded px-1.5 py-0.5 text-sm font-semibold focus:outline-none resize-none min-w-0"
                    style={{ minWidth: 80 }}
                    placeholder="Type here..."
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = el.scrollHeight + "px";
                    }}
                  />
                ) : (
                  <div
                    className="flex-1 text-white text-sm font-semibold px-1 py-0.5 cursor-text whitespace-pre-wrap break-words min-w-0"
                    style={{ minWidth: 80, minHeight: 24 }}
                    onClick={(e) => { e.stopPropagation(); setEditingId(card.id); }}
                  >
                    {card.text || <span className="opacity-40 font-normal italic">click to edit</span>}
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }}
                  className="text-white/50 hover:text-white flex-shrink-0 mt-0.5 transition-colors"
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media print {
          .print\\:hidden { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
