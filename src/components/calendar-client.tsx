"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, subWeeks, addMonths, subMonths, eachDayOfInterval,
  isSameDay, isWithinInterval, parseISO, addDays, differenceInDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, LayoutGrid, Search, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { requestGoogleSync, getLastSyncTime } from "@/lib/google-sync";

interface Job {
  id: string;
  title: string;
  customer: string;
  jobLead: string;
  startDate: string;
  endDate: string;
  startTime?: string;
  colorTag: string;
  jobType: string;
  jobNumber: string;
  address: string;
}

interface CrewOff {
  id: string;
  crewName: string;
  startDate: string;
  endDate: string;
  note: string;
}

interface DayWeather {
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

type ViewMode = "week" | "month" | "day";

// Open-Meteo weather code → emoji + label
function weatherEmoji(code: number): string {
  if (code === 0) return "☀️";
  if (code <= 2) return "⛅";
  if (code === 3) return "☁️";
  if (code <= 49) return "🌫️";
  if (code <= 59) return "🌧️";
  if (code <= 69) return "🌨️";
  if (code <= 79) return "❄️";
  if (code <= 82) return "🌧️";
  if (code <= 84) return "🌨️";
  if (code <= 99) return "⛈️";
  return "🌤️";
}

// Hamilton, ON coordinates as default (can be made configurable)
const DEFAULT_LAT = 43.2557;
const DEFAULT_LON = -79.8711;

export function CalendarClient() {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [mounted, setMounted] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [crewOffs, setCrewOffs] = useState<CrewOff[]>([]);
  const [loading, setLoading] = useState(true);
  const [weather, setWeather] = useState<Record<string, DayWeather>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [allJobs, setAllJobs] = useState<Job[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [slideDir, setSlideDir] = useState<"left" | "right" | null>(null);
  const [slideKey, setSlideKey] = useState(0);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const slideContainerRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async (start: Date, end: Date) => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/calendar?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      const data = await res.json();
      setJobs(data.jobs || []);
      setCrewOffs(data.crewOffs || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWeather = useCallback(async (start: Date, end: Date) => {
    // Only fetch weather for dates within 16 days from today (API limit)
    const today = new Date();
    const maxForecastDate = addDays(today, 15);
    if (start > maxForecastDate) return;

    const startStr = format(start, "yyyy-MM-dd");
    const endStr = format(end > maxForecastDate ? maxForecastDate : end, "yyyy-MM-dd");

    try {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${DEFAULT_LAT}&longitude=${DEFAULT_LON}&daily=temperature_2m_max,temperature_2m_min,weathercode&temperature_unit=celsius&timezone=America%2FToronto&start_date=${startStr}&end_date=${endStr}`
      );
      const data = await res.json();
      if (!data.daily) return;

      const map: Record<string, DayWeather> = {};
      data.daily.time.forEach((dateStr: string, i: number) => {
        map[dateStr] = {
          tempMax: Math.round(data.daily.temperature_2m_max[i]),
          tempMin: Math.round(data.daily.temperature_2m_min[i]),
          weatherCode: data.daily.weathercode[i],
        };
      });
      setWeather(map);
    } catch {
      // Weather is non-critical, fail silently
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    // Need non-passive touchmove to call preventDefault and block page scroll during horizontal swipe
    const el = slideContainerRef.current?.parentElement;
    if (!el) return;
    const onMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      e.preventDefault();
    };
    el.addEventListener("touchmove", onMove, { passive: false });
    return () => el.removeEventListener("touchmove", onMove);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Load GIS script for auto-sync
    if (!document.getElementById("gis-script")) {
      const script = document.createElement("script");
      script.id = "gis-script";
      script.src = "https://accounts.google.com/gsi/client";
      document.body.appendChild(script);
    }

    const THIRTY_MINUTES = 30 * 60 * 1000;

    function tryAutoSync() {
      const lastSync = getLastSyncTime();
      if (Date.now() - lastSync < THIRTY_MINUTES) return;
      requestGoogleSync({
        prompt: "",
        onSuccess: () => {
          // Refresh calendar data after silent sync
          const start = viewMode === "week"
            ? startOfWeek(currentDate, { weekStartsOn: 0 })
            : viewMode === "day" ? currentDate : startOfMonth(currentDate);
          const end = viewMode === "week"
            ? endOfWeek(currentDate, { weekStartsOn: 0 })
            : viewMode === "day" ? currentDate : endOfMonth(currentDate);
          fetchData(start, end);
        },
      });
    }

    // Try once on mount (after a short delay so GIS can load)
    const mountTimer = setTimeout(tryAutoSync, 3000);
    // Then check every 30 minutes
    const interval = setInterval(tryAutoSync, THIRTY_MINUTES);

    return () => {
      clearTimeout(mountTimer);
      clearInterval(interval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;
    let start: Date, end: Date;
    if (viewMode === "week") {
      start = startOfWeek(currentDate, { weekStartsOn: 0 });
      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else if (viewMode === "day") {
      start = currentDate;
      end = currentDate;
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }
    fetchData(start, end);
    fetchWeather(start, end);
  }, [currentDate, viewMode, fetchData, fetchWeather, mounted]);

  useEffect(() => {
    if (!searchQuery || allJobs.length > 0) return;
    const start = new Date(Date.now() - 365 * 2 * 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000).toISOString();
    fetch(`/api/calendar?start=${start}&end=${end}`)
      .then((r) => r.json())
      .then((d) => setAllJobs(d.jobs || []));
  }, [searchQuery, allJobs.length]);

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
  }

  function handleTouchMove(e: React.TouchEvent) {
    const dx = e.touches[0].clientX - touchStartX.current;
    const dy = e.touches[0].clientY - touchStartY.current;
    if (!isDragging.current) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) return; // vertical scroll, ignore
      isDragging.current = true;
    }
    e.preventDefault();
    const el = slideContainerRef.current;
    if (!el) return;
    // Rubber-band resistance at edges
    const resistance = 0.4;
    el.style.transition = "none";
    el.style.transform = `translateX(${dx * resistance}px)`;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const el = slideContainerRef.current;
    if (!isDragging.current || !el) return;
    isDragging.current = false;

    if (Math.abs(dx) > 60) {
      const dir = dx < 0 ? "next" : "prev";
      // Slide out
      el.style.transition = "transform 0.18s ease-in";
      el.style.transform = `translateX(${dx < 0 ? "-100%" : "100%"})`;
      setTimeout(() => {
        navigate(dir);
        // navigate() updates slideKey which remounts the element with a CSS slide-in animation
        if (el) { el.style.transition = "none"; el.style.transform = ""; }
      }, 180);
    } else {
      // Spring back
      el.style.transition = "transform 0.25s ease-out";
      el.style.transform = "translateX(0)";
    }
  }

  function handleSync() {
    setSyncing(true);
    requestGoogleSync({
      onSuccess: () => {
        const start = viewMode === "week"
          ? startOfWeek(currentDate, { weekStartsOn: 0 })
          : viewMode === "day" ? currentDate : startOfMonth(currentDate);
        const end = viewMode === "week"
          ? endOfWeek(currentDate, { weekStartsOn: 0 })
          : viewMode === "day" ? currentDate : endOfMonth(currentDate);
        fetchData(start, end);
        setSyncing(false);
      },
      onError: () => setSyncing(false),
    });
  }

  function navigate(direction: "prev" | "next") {
    setSlideDir(direction === "next" ? "left" : "right");
    setSlideKey((k) => k + 1);
    if (viewMode === "week") {
      setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else if (viewMode === "day") {
      setCurrentDate(direction === "prev" ? addDays(currentDate, -1) : addDays(currentDate, 1));
    } else {
      setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  }

  function getJobsForDay(day: Date): Job[] {
    const pad = (n: number) => String(n).padStart(2, "0");
    const dayStr = `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
    return jobs.filter((job) => {
      const start = new Date(job.startDate);
      const end = new Date(job.endDate);
      const startStr = `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`;
      const endStr = `${end.getFullYear()}-${pad(end.getMonth() + 1)}-${pad(end.getDate())}`;
      return dayStr >= startStr && dayStr <= endStr;
    });
  }

  function getCrewOffForDay(day: Date): CrewOff[] {
    return crewOffs.filter((co) => {
      const start = parseISO(co.startDate);
      const end = parseISO(co.endDate);
      try {
        return isWithinInterval(day, { start, end });
      } catch {
        return isSameDay(day, start);
      }
    });
  }

  function getWeatherForDay(day: Date): DayWeather | null {
    const key = format(day, "yyyy-MM-dd");
    return weather[key] || null;
  }

  const today = new Date();
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: addDays(weekStart, 6) });

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const monthDays = eachDayOfInterval({ start: calStart, end: calEnd });

  const headerLabel = viewMode === "week"
    ? `${format(weekStart, "MMM d")} – ${format(addDays(weekStart, 6), "MMM d, yyyy")}`
    : viewMode === "day"
    ? format(currentDate, "EEEE, MMM d, yyyy")
    : format(currentDate, "MMMM yyyy");

  if (!mounted) {
    return <div className="max-w-7xl mx-auto py-8 text-center text-gray-400 text-sm">Loading calendar...</div>;
  }

  return (
    <div className="max-w-7xl mx-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("prev")}
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
            onClick={() => navigate("next")}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <span className="ml-2 font-semibold text-gray-900 text-sm sm:text-base">{headerLabel}</span>
        </div>
        <div className="flex items-center gap-2">
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 disabled:opacity-50 transition-colors"
          title="Sync from Google Calendar"
        >
          <RefreshCw size={14} className={syncing ? "animate-spin" : ""} />
          <span className="hidden sm:inline">Sync</span>
        </button>
        <div className="flex items-center bg-white rounded-lg border border-gray-200 p-0.5">
          <button
            onClick={() => setViewMode("week")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              viewMode === "week" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <Calendar size={14} />
            <span className="hidden sm:inline">Week</span>
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors",
              viewMode === "month" ? "bg-gray-900 text-white" : "text-gray-600 hover:text-gray-900"
            )}
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Month</span>
          </button>
        </div>
        </div>
        {viewMode === "day" && (
          <button
            onClick={() => setViewMode("month")}
            className="ml-2 text-sm text-gray-500 hover:text-gray-900 underline"
          >
            ← Back
          </button>
        )}
      </div>

      <div className="relative mb-2 px-1">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search jobs..."
          className="w-full pl-8 pr-8 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
            <X size={15} />
          </button>
        )}
      </div>

      {searchQuery && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden mb-2">
          {(() => {
            const q = searchQuery.toLowerCase();
            const results = allJobs.filter((j) =>
              j.title.toLowerCase().includes(q) ||
              j.customer?.toLowerCase().includes(q) ||
              j.jobNumber?.toLowerCase().includes(q) ||
              j.address?.toLowerCase().includes(q)
            );
            if (results.length === 0) return <div className="p-4 text-sm text-gray-400 text-center">No jobs found</div>;
            return results.slice(0, 20).map((job) => (
              <Link
                key={job.id}
                href={`/jobs/${job.id}`}
                onClick={() => setSearchQuery("")}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
              >
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: job.colorTag }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{job.title}</div>
                  <div className="text-xs text-gray-400 truncate">{[job.jobNumber, job.address].filter(Boolean).join(" · ")}</div>
                </div>
                <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
              </Link>
            ));
          })()}
        </div>
      )}

      {loading && !searchQuery && (
        <div className="text-center py-4 text-gray-400 text-sm animate-pulse">Loading...</div>
      )}

      <style>{`
        @keyframes slideInLeft { from { transform: translateX(60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes slideInRight { from { transform: translateX(-60px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .slide-left { animation: slideInLeft 0.2s ease-out; }
        .slide-right { animation: slideInRight 0.2s ease-out; }
      `}</style>

      <div ref={slideContainerRef}>

      {/* Week View */}
      {!searchQuery && viewMode === "week" && (
        <div key={slideKey} className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${slideDir === "left" ? "slide-left" : slideDir === "right" ? "slide-right" : ""}`}>
          <div className="grid grid-cols-7 border-b border-gray-200">
            {weekDays.map((day) => {
              const w = getWeatherForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => { setCurrentDate(day); setViewMode("day"); }}
                  className={cn(
                    "px-1 py-2 text-center cursor-pointer hover:bg-blue-50/50 transition-colors",
                    isSameDay(day, today) && "bg-blue-50"
                  )}
                >
                  <div className="text-xs text-gray-500 font-medium">{format(day, "EEE")}</div>
                  <div className={cn(
                    "text-sm font-bold mt-0.5 w-7 h-7 flex items-center justify-center rounded-full mx-auto",
                    isSameDay(day, today) ? "bg-blue-600 text-white" : "text-gray-900"
                  )}>
                    {format(day, "d")}
                  </div>
                  {w && (
                    <div className="mt-1">
                      <div className="text-base leading-none">{weatherEmoji(w.weatherCode)}</div>
                      <div className="text-xs text-gray-500 leading-tight">
                        <span className="text-gray-800 font-medium">{w.tempMax}°</span>
                        <span className="text-gray-400 ml-0.5">{w.tempMin}°</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-7 divide-x divide-gray-100 min-h-96">
            {weekDays.map((day) => {
              const dayJobs = getJobsForDay(day);
              const dayCrewOff = getCrewOffForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "p-1 space-y-1",
                    isSameDay(day, today) && "bg-blue-50/30"
                  )}
                >
                  {dayCrewOff.length > 0 && (
                    <div className="text-xs bg-amber-100 text-amber-700 rounded px-1 py-0.5 truncate border border-amber-200">
                      {dayCrewOff.map(co => co.crewName).join(", ")} off
                    </div>
                  )}
                  {dayJobs.map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="block rounded-lg px-1.5 py-1 text-white text-xs hover:opacity-90 active:opacity-75 transition-opacity shadow-sm"
                      style={{ backgroundColor: job.colorTag }}
                    >
                      {job.startTime && (
                        <div className="text-xs opacity-80 font-mono leading-none mb-0.5">{job.startTime}</div>
                      )}
                      <div className="font-semibold truncate leading-tight">{job.title}</div>
                      {job.jobLead && (
                        <div className="opacity-80 truncate text-xs">{job.jobLead}</div>
                      )}
                    </Link>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Month View */}
      {!searchQuery && viewMode === "month" && (
        <div key={slideKey} className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${slideDir === "left" ? "slide-left" : slideDir === "right" ? "slide-right" : ""}`}>
          <div className="grid grid-cols-7 border-b border-gray-200">
            {["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {monthDays.map((day) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const dayJobs = getJobsForDay(day);
              const dayCrewOff = getCrewOffForDay(day);
              const w = getWeatherForDay(day);
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => { setCurrentDate(day); setViewMode("day"); }}
                  className={cn(
                    "min-h-20 p-1 border-b border-r border-gray-100 cursor-pointer hover:bg-blue-50/30 transition-colors",
                    !isCurrentMonth && "bg-gray-50/50",
                    isSameDay(day, today) && "bg-blue-50/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-0.5">
                    <div className={cn(
                      "text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full",
                      isSameDay(day, today) ? "bg-blue-600 text-white" : isCurrentMonth ? "text-gray-900" : "text-gray-300"
                    )}>
                      {format(day, "d")}
                    </div>
                    {w && isCurrentMonth && (
                      <div className="text-right leading-none">
                        <div className="text-sm">{weatherEmoji(w.weatherCode)}</div>
                        <div className="text-xs text-gray-400">{w.tempMax}°</div>
                      </div>
                    )}
                  </div>
                  {dayCrewOff.length > 0 && (
                    <div className="text-xs bg-amber-100 text-amber-600 rounded px-1 mb-0.5 truncate">
                      {dayCrewOff.map(co => co.crewName).join(", ")} off
                    </div>
                  )}
                  {dayJobs.slice(0, 3).map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="block rounded px-1 py-0.5 text-white text-xs mb-0.5 hover:opacity-90 truncate shadow-sm"
                      style={{ backgroundColor: job.colorTag }}
                    >
                      {job.title}
                    </Link>
                  ))}
                  {dayJobs.length > 3 && (
                    <div className="text-xs text-gray-400 pl-1">+{dayJobs.length - 3} more</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {!searchQuery && viewMode === "day" && (
        <div key={slideKey} className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${slideDir === "left" ? "slide-left" : slideDir === "right" ? "slide-right" : ""}`}>
          <div className="p-4 border-b border-gray-100">
            {(() => {
              const w = getWeatherForDay(currentDate);
              const dayCrewOff = getCrewOffForDay(currentDate);
              return (
                <>
                  {w && (
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                      <span>{weatherEmoji(w.weatherCode)}</span>
                      <span>{w.tempMax}° / {w.tempMin}°</span>
                    </div>
                  )}
                  {dayCrewOff.length > 0 && (
                    <div className="text-sm bg-amber-100 text-amber-700 rounded px-2 py-1 mb-3">
                      Off: {dayCrewOff.map(co => co.crewName).join(", ")}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          <div className="divide-y divide-gray-100">
            {getJobsForDay(currentDate).length === 0 ? (
              <div className="p-8 text-center text-gray-400 text-sm">No jobs scheduled</div>
            ) : (
              getJobsForDay(currentDate).map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="w-3 h-3 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: job.colorTag }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm">{job.title}</div>
                    {job.startTime && <div className="text-xs text-gray-500 mt-0.5">{job.startTime}</div>}
                    {job.address && <div className="text-xs text-gray-500 mt-0.5">{job.address}</div>}
                    {job.jobLead && <div className="text-xs text-gray-400 mt-0.5">Lead: {job.jobLead}</div>}
                  </div>
                  <ChevronRight size={16} className="text-gray-300 flex-shrink-0 mt-0.5" />
                </Link>
              ))
            )}
          </div>
        </div>
      )}

      </div>{/* end slideContainerRef */}
    </div>
  );
}
