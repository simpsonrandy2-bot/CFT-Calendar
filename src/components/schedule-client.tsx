"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { format, addDays } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Truck, Printer, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_CREW_MEMBERS, TRUCKS } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  address: string;
  colorTag: string;
  startTime?: string | null;
}

interface BoardCard {
  id: string;
  date: string;
  jobId: string | null;
  job: Job | null;
  label: string;
  color: string;
  x: number;
  y: number;
  width: number;
  crew: string;
  truck: string;
}

const PALETTE = [
  "#3B82F6", "#1D4ED8", "#0EA5E9", "#06B6D4",
  "#10B981", "#16A34A", "#84CC16", "#EAB308",
  "#F97316", "#EF4444", "#EC4899", "#8B5CF6",
  "#6366F1", "#64748B", "#1E293B", "#78716C",
];

function parseCrew(s: string): string[] {
  try { return JSON.parse(s); } catch { return []; }
}

export function ScheduleClient() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [mounted, setMounted] = useState(false);
  const [cards, setCards] = useState<BoardCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);

  const draggingId = useRef<string | null>(null);
  const dragStart = useRef({ mx: 0, my: 0, cx: 0, cy: 0 });
  const pendingSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [colorPickerId, setColorPickerId] = useState<string | null>(null);
  const [crewPickerId, setCrewPickerId] = useState<string | null>(null);
  const [truckPickerId, setTruckPickerId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const dayLabel = format(currentDate, "EEEE, MMMM d, yyyy");

  const fetchCards = useCallback(async (ds: string) => {
    setLoading(true);
    setCards([]);
    const res = await fetch(`/api/board?date=${ds}`);
    const data = await res.json();
    setCards(Array.isArray(data) ? data : []);
    setLoading(false);
  }, []);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => { if (mounted) fetchCards(dateStr); }, [dateStr, mounted, fetchCards]);

  // Global drag handlers
  useEffect(() => {
    function onMove(e: MouseEvent | TouchEvent) {
      if (!draggingId.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : (e as MouseEvent).clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : (e as MouseEvent).clientY;
      const dx = clientX - dragStart.current.mx;
      const dy = clientY - dragStart.current.my;
      const newX = Math.max(0, dragStart.current.cx + dx);
      const newY = Math.max(0, dragStart.current.cy + dy);
      setCards((prev) =>
        prev.map((c) => (c.id === draggingId.current ? { ...c, x: newX, y: newY } : c))
      );
    }

    function onUp() {
      if (!draggingId.current) return;
      const id = draggingId.current;
      draggingId.current = null;
      setActiveDragId(null);
      if (pendingSave.current) clearTimeout(pendingSave.current);
      pendingSave.current = setTimeout(() => {
        setCards((prev) => {
          const card = prev.find((c) => c.id === id);
          if (card) {
            fetch(`/api/board/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ x: card.x, y: card.y }),
            });
          }
          return prev;
        });
      }, 300);
    }

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

  function startDrag(e: React.MouseEvent | React.TouchEvent, card: BoardCard) {
    const target = e.target as HTMLElement;
    if (["BUTTON", "INPUT", "SELECT", "TEXTAREA"].includes(target.tagName)) return;
    e.preventDefault();
    const clientX = "touches" in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    draggingId.current = card.id;
    setActiveDragId(card.id);
    dragStart.current = { mx: clientX, my: clientY, cx: card.x, cy: card.y };
    closeAll();
  }

  function closeAll() {
    setColorPickerId(null);
    setCrewPickerId(null);
    setTruckPickerId(null);
  }

  async function patch(id: string, fields: Record<string, unknown>) {
    const res = await fetch(`/api/board/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    });
    const updated = await res.json();
    setCards((prev) => prev.map((c) => (c.id === id ? { ...c, ...updated } : c)));
  }

  async function addCrewToCard(cardId: string, member: string) {
    const card = cards.find((c) => c.id === cardId)!;
    const crew = [...parseCrew(card.crew), member];
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, crew: JSON.stringify(crew) } : c)));
    setCrewPickerId(null);
    await fetch(`/api/board/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crew: JSON.stringify(crew) }),
    });
  }

  async function removeCrewFromCard(cardId: string, member: string) {
    const card = cards.find((c) => c.id === cardId)!;
    const crew = parseCrew(card.crew).filter((m) => m !== member);
    setCards((prev) => prev.map((c) => (c.id === cardId ? { ...c, crew: JSON.stringify(crew) } : c)));
    await fetch(`/api/board/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ crew: JSON.stringify(crew) }),
    });
  }

  async function addCustomCard() {
    const offset = cards.length;
    const x = 20 + (offset % 4) * 230;
    const y = 20 + Math.floor(offset / 4) * 260;
    const res = await fetch("/api/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, label: "Label", color: "#6B7280", x, y, width: 180 }),
    });
    const card = await res.json();
    setCards((prev) => [...prev, card]);
    setEditingId(card.id);
  }

  async function deleteCard(cardId: string) {
    setCards((prev) => prev.filter((c) => c.id !== cardId));
    await fetch(`/api/board/${cardId}`, { method: "DELETE" });
  }

  const assignedCrew = new Set(cards.flatMap((c) => parseCrew(c.crew)));
  const unassignedCrew = DEFAULT_CREW_MEMBERS.filter((m) => !assignedCrew.has(m));

  const canvasW = Math.max(900, ...cards.map((c) => c.x + c.width + 60));
  const canvasH = Math.max(600, ...cards.map((c) => c.y + 280));

  if (!mounted) return null;

  return (
    <div
      className="flex flex-col h-full"
      style={{ userSelect: "none" }}
      onClick={() => closeAll()}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3 flex-shrink-0">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentDate((d) => addDays(d, -1))}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-3 py-1.5 text-sm font-medium hover:bg-white rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate((d) => addDays(d, 1))}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <h1 className="ml-2 font-bold text-gray-900 text-xl">{dayLabel}</h1>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={addCustomCard}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Type size={14} />
            <span className="hidden sm:inline">Add Label</span>
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer size={14} />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {/* ── Canvas ── */}
      <div className="flex-1 overflow-auto rounded-xl border border-gray-200 bg-white shadow-sm">
        <div
          ref={canvasRef}
          className="relative"
          style={{
            width: canvasW,
            height: canvasH,
            backgroundImage: "radial-gradient(circle, #cbd5e1 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm animate-pulse">
              Loading schedule...
            </div>
          )}

          {!loading && cards.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400 text-sm">
              <div>No jobs scheduled for this day</div>
            </div>
          )}

          {cards.map((card) => {
            const crew = parseCrew(card.crew);
            const availableCrew = DEFAULT_CREW_MEMBERS.filter((m) => !crew.includes(m));
            const title = card.job?.title ?? card.label ?? "Untitled";
            const address = card.job?.address ?? "";
            const startTime = card.job?.startTime ?? null;
            const isDragging = activeDragId === card.id;

            return (
              <div
                key={card.id}
                className={cn(
                  "absolute rounded-xl bg-white border border-gray-200 overflow-visible",
                  isDragging
                    ? "shadow-2xl cursor-grabbing ring-2 ring-blue-400/40"
                    : "shadow-md cursor-grab hover:shadow-lg transition-shadow"
                )}
                style={{
                  left: card.x,
                  top: card.y,
                  width: card.width,
                  zIndex: isDragging ? 1000 : 10,
                }}
                onMouseDown={(e) => startDrag(e, card)}
                onTouchStart={(e) => startDrag(e, card)}
              >
                {/* ── Card header ── */}
                <div
                  className="rounded-t-xl px-3 py-2.5"
                  style={{ backgroundColor: card.color }}
                >
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      {editingId === card.id ? (
                        <input
                          autoFocus
                          value={card.label}
                          onChange={(e) =>
                            setCards((prev) =>
                              prev.map((c) => (c.id === card.id ? { ...c, label: e.target.value } : c))
                            )
                          }
                          onBlur={() => { setEditingId(null); patch(card.id, { label: card.label }); }}
                          onKeyDown={(e) => {
                            e.stopPropagation();
                            if (e.key === "Enter") { setEditingId(null); patch(card.id, { label: card.label }); }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full bg-white/25 text-white placeholder-white/60 rounded-md px-1.5 py-0.5 text-sm font-bold focus:outline-none focus:bg-white/35"
                          placeholder="Label text..."
                        />
                      ) : (
                        <div
                          className="text-white font-bold text-sm leading-snug"
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            if (!card.jobId) setEditingId(card.id);
                          }}
                        >
                          {title}
                        </div>
                      )}

                      {address && (
                        <div className="text-white/75 text-xs mt-0.5 leading-tight">{address}</div>
                      )}
                      {startTime && (
                        <div className="text-white/70 text-xs font-mono mt-0.5">{startTime}</div>
                      )}
                    </div>

                    {/* Color picker trigger */}
                    <div className="flex items-center gap-1 flex-shrink-0 mt-0.5">
                      <button
                        title="Change color"
                        onClick={(e) => {
                          e.stopPropagation();
                          setColorPickerId(colorPickerId === card.id ? null : card.id);
                          setCrewPickerId(null);
                          setTruckPickerId(null);
                        }}
                        className="w-4 h-4 rounded-full border-2 border-white/50 hover:border-white transition-colors flex-shrink-0"
                        style={{ backgroundColor: card.color }}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteCard(card.id); }}
                        className="text-white/60 hover:text-white transition-colors"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Color palette popover */}
                {colorPickerId === card.id && (
                  <div
                    className="absolute right-0 top-full mt-1.5 bg-white border border-gray-200 rounded-xl shadow-xl p-2.5 z-50"
                    style={{ width: 172 }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="text-xs font-semibold text-gray-500 mb-2">Card color</div>
                    <div className="grid grid-cols-4 gap-1.5">
                      {PALETTE.map((c) => (
                        <button
                          key={c}
                          onClick={() => { patch(card.id, { color: c }); setColorPickerId(null); }}
                          className="w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110"
                          style={{
                            backgroundColor: c,
                            borderColor: c === card.color ? "#111827" : "transparent",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* ── Card body ── */}
                <div className="p-2.5 space-y-2">
                  {/* Truck selector */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTruckPickerId(truckPickerId === card.id ? null : card.id);
                        setCrewPickerId(null);
                        setColorPickerId(null);
                      }}
                      className={cn(
                        "flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors text-left",
                        card.truck
                          ? "bg-gray-800 text-white border-gray-800"
                          : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <Truck size={11} className="flex-shrink-0" />
                      <span className="truncate">{card.truck || "Assign truck..."}</span>
                    </button>

                    {truckPickerId === card.id && (
                      <div
                        className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {card.truck && (
                          <button
                            onClick={() => { patch(card.id, { truck: "" }); setTruckPickerId(null); }}
                            className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-red-50 transition-colors"
                          >
                            Remove truck
                          </button>
                        )}
                        {TRUCKS.map((t) => (
                          <button
                            key={t}
                            onClick={() => { patch(card.id, { truck: t }); setTruckPickerId(null); }}
                            className={cn(
                              "w-full text-left px-3 py-1.5 text-xs transition-colors",
                              t === card.truck
                                ? "bg-gray-100 font-semibold text-gray-900"
                                : "hover:bg-gray-50 text-gray-700"
                            )}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Crew chips */}
                  {crew.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {crew.map((member) => (
                        <span
                          key={member}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                          style={{
                            backgroundColor: card.color + "22",
                            color: card.color,
                            border: `1px solid ${card.color}44`,
                          }}
                        >
                          {member}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeCrewFromCard(card.id, member); }}
                            className="hover:opacity-60 transition-opacity"
                          >
                            <X size={9} />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Add crew */}
                  <div className="relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCrewPickerId(crewPickerId === card.id ? null : card.id);
                        setTruckPickerId(null);
                        setColorPickerId(null);
                      }}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <Plus size={11} />
                      Add crew
                    </button>

                    {crewPickerId === card.id && (
                      <div
                        className="absolute z-50 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-36"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {availableCrew.length === 0 ? (
                          <div className="px-3 py-2 text-xs text-gray-400">All crew assigned</div>
                        ) : (
                          availableCrew.map((member) => (
                            <button
                              key={member}
                              onClick={() => addCrewToCard(card.id, member)}
                              className="w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 text-gray-700 transition-colors"
                            >
                              {member}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Unassigned crew bar ── */}
      {unassignedCrew.length > 0 && (
        <div className="mt-2 flex-shrink-0 bg-white rounded-xl border border-amber-200 px-4 py-2.5 flex items-center gap-3">
          <span className="text-xs font-bold text-amber-700 whitespace-nowrap uppercase tracking-wide">
            Unassigned
          </span>
          <div className="flex flex-wrap gap-2">
            {unassignedCrew.map((m) => (
              <span
                key={m}
                className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-semibold border border-amber-200"
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @media print {
          nav, .no-print { display: none !important; }
          body { background: white; }
        }
      `}</style>
    </div>
  );
}
