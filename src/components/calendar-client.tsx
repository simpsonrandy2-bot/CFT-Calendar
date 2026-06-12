"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import {
  format, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  addWeeks, subWeeks, addMonths, subMonths, eachDayOfInterval,
  isSameDay, isWithinInterval, parseISO, addDays,
} from "date-fns";
import { ChevronLeft, ChevronRight, Calendar, LayoutGrid } from "lucide-react";
import { cn } from "@/lib/utils";

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
}

interface CrewOff {
  id: string;
  crewName: string;
  startDate: string;
  endDate: string;
  note: string;
}

type ViewMode = "week" | "month";

export function CalendarClient() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [crewOffs, setCrewOffs] = useState<CrewOff[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    let start: Date, end: Date;
    if (viewMode === "week") {
      start = startOfWeek(currentDate, { weekStartsOn: 0 });
      end = endOfWeek(currentDate, { weekStartsOn: 0 });
    } else {
      start = startOfMonth(currentDate);
      end = endOfMonth(currentDate);
    }
    fetchData(start, end);
  }, [currentDate, viewMode, fetchData]);

  function navigate(direction: "prev" | "next") {
    if (viewMode === "week") {
      setCurrentDate(direction === "prev" ? subWeeks(currentDate, 1) : addWeeks(currentDate, 1));
    } else {
      setCurrentDate(direction === "prev" ? subMonths(currentDate, 1) : addMonths(currentDate, 1));
    }
  }

  function getJobsForDay(day: Date): Job[] {
    return jobs.filter((job) => {
      const start = parseISO(job.startDate);
      const end = parseISO(job.endDate);
      try {
        return isWithinInterval(day, { start, end });
      } catch {
        return isSameDay(day, start);
      }
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
    : format(currentDate, "MMMM yyyy");

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-3 px-1">
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

      {loading && (
        <div className="text-center py-4 text-gray-400 text-sm animate-pulse">Loading...</div>
      )}

      {/* Week View */}
      {viewMode === "week" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-gray-200">
            {weekDays.map((day) => (
              <div
                key={day.toISOString()}
                className={cn(
                  "px-1 py-2 text-center",
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
              </div>
            ))}
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
      {viewMode === "month" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "min-h-20 p-1 border-b border-r border-gray-100",
                    !isCurrentMonth && "bg-gray-50/50",
                    isSameDay(day, today) && "bg-blue-50/50"
                  )}
                >
                  <div className={cn(
                    "text-sm font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                    isSameDay(day, today) ? "bg-blue-600 text-white" : isCurrentMonth ? "text-gray-900" : "text-gray-300"
                  )}>
                    {format(day, "d")}
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
    </div>
  );
}
