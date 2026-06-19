"use client";

import { useEffect, useState, useCallback } from "react";
import { format, addDays, parseISO, startOfWeek, isWithinInterval, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus, X, Printer, Truck, User, CheckSquare, Square, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEFAULT_CREW_MEMBERS, TRUCKS } from "@/lib/utils";

interface Job {
  id: string;
  title: string;
  customer: string;
  address: string;
  startDate: string;
  endDate: string;
  colorTag: string;
  jobType: string;
  startTime?: string;
}

interface DailyAssignment {
  id: string;
  jobId: string;
  crewMembers: string; // JSON
  truck: string;
  notes: string;
  job: Job;
}

interface WeekTask {
  id: string;
  weekOf: string;
  title: string;
  color: string;
  assignedTo: string;
  done: boolean;
}

const TASK_COLORS = [
  "#94A3B8", "#F59E0B", "#10B981", "#3B82F6",
  "#8B5CF6", "#EF4444", "#F97316", "#06B6D4",
];

function getWeekOf(date: Date): string {
  return format(startOfWeek(date, { weekStartsOn: 0 }), "yyyy-MM-dd");
}

export function ScheduleClient() {
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [mounted, setMounted] = useState(false);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [assignments, setAssignments] = useState<DailyAssignment[]>([]);
  const [weekTasks, setWeekTasks] = useState<WeekTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTaskPanel, setShowTaskPanel] = useState(true);

  // Crew picker state: which job card is open
  const [crewPickerJobId, setCrewPickerJobId] = useState<string | null>(null);
  // Truck picker state
  const [truckPickerJobId, setTruckPickerJobId] = useState<string | null>(null);

  // Add task form
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskColor, setNewTaskColor] = useState(TASK_COLORS[0]);
  const [showAddTask, setShowAddTask] = useState(false);

  const dateStr = format(currentDate, "yyyy-MM-dd");
  const weekOf = getWeekOf(currentDate);

  const fetchDayData = useCallback(async (date: Date) => {
    setLoading(true);
    const ds = format(date, "yyyy-MM-dd");
    const wk = getWeekOf(date);

    const dayStart = new Date(ds);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(ds);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const [calRes, assignRes, taskRes] = await Promise.all([
      fetch(`/api/calendar?start=${dayStart.toISOString()}&end=${dayEnd.toISOString()}`),
      fetch(`/api/daily-assignments?date=${ds}`),
      fetch(`/api/week-tasks?weekOf=${wk}`),
    ]);

    const [calData, assignData, taskData] = await Promise.all([
      calRes.json(),
      assignRes.json(),
      taskRes.json(),
    ]);

    setJobs(calData.jobs || []);
    setAssignments(Array.isArray(assignData) ? assignData : []);
    setWeekTasks(Array.isArray(taskData) ? taskData : []);
    setLoading(false);
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchDayData(currentDate);
  }, [currentDate, mounted, fetchDayData]);

  function getAssignment(jobId: string): DailyAssignment | undefined {
    return assignments.find((a) => a.jobId === jobId);
  }

  function getCrewForJob(jobId: string): string[] {
    const a = getAssignment(jobId);
    if (!a) return [];
    try { return JSON.parse(a.crewMembers); } catch { return []; }
  }

  function getTruckForJob(jobId: string): string {
    return getAssignment(jobId)?.truck ?? "";
  }

  async function saveAssignment(jobId: string, crewMembers: string[], truck: string) {
    const res = await fetch("/api/daily-assignments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: dateStr, jobId, crewMembers, truck }),
    });
    const updated = await res.json();
    setAssignments((prev) => {
      const filtered = prev.filter((a) => a.jobId !== jobId);
      return [...filtered, updated];
    });
  }

  async function addCrewToJob(jobId: string, member: string) {
    const current = getCrewForJob(jobId);
    if (current.includes(member)) return;
    const truck = getTruckForJob(jobId);
    await saveAssignment(jobId, [...current, member], truck);
    setCrewPickerJobId(null);
  }

  async function removeCrewFromJob(jobId: string, member: string) {
    const current = getCrewForJob(jobId).filter((m) => m !== member);
    const truck = getTruckForJob(jobId);
    await saveAssignment(jobId, current, truck);
  }

  async function setTruck(jobId: string, truck: string) {
    const crew = getCrewForJob(jobId);
    await saveAssignment(jobId, crew, truck);
    setTruckPickerJobId(null);
  }

  async function toggleTaskDone(task: WeekTask) {
    const res = await fetch(`/api/week-tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done }),
    });
    const updated = await res.json();
    setWeekTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/week-tasks/${taskId}`, { method: "DELETE" });
    setWeekTasks((prev) => prev.filter((t) => t.id !== taskId));
  }

  async function addTask() {
    if (!newTaskTitle.trim()) return;
    const res = await fetch("/api/week-tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekOf, title: newTaskTitle.trim(), color: newTaskColor }),
    });
    const task = await res.json();
    setWeekTasks((prev) => [...prev, task]);
    setNewTaskTitle("");
    setShowAddTask(false);
  }

  // All crew assigned today across all jobs
  const assignedCrew = new Set(
    jobs.flatMap((j) => getCrewForJob(j.id))
  );
  const unassignedCrew = DEFAULT_CREW_MEMBERS.filter((m) => !assignedCrew.has(m));

  if (!mounted) return <div className="text-center py-8 text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="flex flex-col h-full" onClick={() => { setCrewPickerJobId(null); setTruckPickerJobId(null); }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentDate(addDays(currentDate, -1)); }}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentDate(new Date()); }}
            className="px-3 py-1.5 text-sm font-medium hover:bg-white rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setCurrentDate(addDays(currentDate, 1)); }}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ChevronRight size={20} />
          </button>
          <h1 className="ml-2 font-bold text-gray-900 text-lg">
            {format(currentDate, "EEEE, MMM d")}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); setShowTaskPanel(!showTaskPanel); }}
            className={cn(
              "px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors",
              showTaskPanel ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200"
            )}
          >
            Tasks
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>
      </div>

      {loading && <div className="text-center py-4 text-gray-400 text-sm animate-pulse">Loading...</div>}

      <div className="flex gap-3 flex-1 overflow-hidden">
        {/* Main board */}
        <div className="flex-1 overflow-x-auto overflow-y-auto">
          {jobs.length === 0 && !loading && (
            <div className="text-center py-16 text-gray-400 text-sm bg-white rounded-xl border border-gray-200">
              No jobs scheduled for this day
            </div>
          )}
          <div className="flex gap-3 pb-2" style={{ minWidth: "max-content" }}>
            {jobs.map((job) => {
              const crew = getCrewForJob(job.id);
              const truck = getTruckForJob(job.id);
              const isCrewOpen = crewPickerJobId === job.id;
              const isTruckOpen = truckPickerJobId === job.id;
              const availableCrew = DEFAULT_CREW_MEMBERS.filter((m) => !crew.includes(m));

              return (
                <div
                  key={job.id}
                  className="w-56 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-visible flex flex-col"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Colored header */}
                  <div
                    className="px-3 py-2.5 rounded-t-xl"
                    style={{ backgroundColor: job.colorTag }}
                  >
                    <div className="font-bold text-white text-sm leading-tight truncate">{job.title}</div>
                    {job.address && (
                      <div className="text-xs text-white/80 truncate mt-0.5">{job.address}</div>
                    )}
                    {job.startTime && (
                      <div className="text-xs text-white/70 mt-0.5 font-mono">{job.startTime}</div>
                    )}
                  </div>

                  <div className="p-3 flex flex-col gap-2 flex-1">
                    {/* Truck */}
                    <div className="relative">
                      <button
                        onClick={() => { setTruckPickerJobId(isTruckOpen ? null : job.id); setCrewPickerJobId(null); }}
                        className={cn(
                          "flex items-center gap-1.5 w-full px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors text-left",
                          truck
                            ? "bg-gray-800 text-white border-gray-800"
                            : "bg-gray-50 text-gray-400 border-gray-200 hover:border-gray-300"
                        )}
                      >
                        <Truck size={12} className="flex-shrink-0" />
                        <span className="truncate">{truck || "Assign truck..."}</span>
                      </button>

                      {isTruckOpen && (
                        <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44">
                          {truck && (
                            <button
                              onClick={() => setTruck(job.id, "")}
                              className="w-full text-left px-3 py-2 text-xs text-red-500 hover:bg-red-50 transition-colors"
                            >
                              Remove truck
                            </button>
                          )}
                          {TRUCKS.map((t) => (
                            <button
                              key={t}
                              onClick={() => setTruck(job.id, t)}
                              className={cn(
                                "w-full text-left px-3 py-2 text-xs transition-colors",
                                t === truck
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
                    <div className="flex flex-wrap gap-1">
                      {crew.map((member) => (
                        <span
                          key={member}
                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-xs font-medium"
                        >
                          {member}
                          <button
                            onClick={() => removeCrewFromJob(job.id, member)}
                            className="text-blue-500 hover:text-blue-700 ml-0.5 leading-none"
                          >
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                    </div>

                    {/* Add crew */}
                    <div className="relative">
                      <button
                        onClick={() => { setCrewPickerJobId(isCrewOpen ? null : job.id); setTruckPickerJobId(null); }}
                        className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <Plus size={12} />
                        <span>Add crew</span>
                      </button>

                      {isCrewOpen && (
                        <div className="absolute z-20 top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-36">
                          {availableCrew.length === 0 ? (
                            <div className="px-3 py-2 text-xs text-gray-400">All assigned</div>
                          ) : (
                            availableCrew.map((member) => (
                              <button
                                key={member}
                                onClick={() => addCrewToJob(job.id, member)}
                                className="w-full text-left px-3 py-2 text-xs hover:bg-blue-50 text-gray-700 transition-colors flex items-center gap-2"
                              >
                                <User size={11} className="text-gray-400" />
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

          {/* Unassigned crew bar */}
          {unassignedCrew.length > 0 && (
            <div className="mt-3 bg-white rounded-xl border border-amber-200 px-4 py-3">
              <div className="text-xs font-semibold text-amber-700 mb-2">Unassigned today</div>
              <div className="flex flex-wrap gap-2">
                {unassignedCrew.map((m) => (
                  <span key={m} className="px-2.5 py-1 bg-amber-50 text-amber-800 rounded-full text-xs font-medium border border-amber-200">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Weekly tasks sidebar */}
        {showTaskPanel && (
          <div className="w-52 flex-shrink-0 bg-white rounded-xl border border-gray-200 shadow-sm overflow-y-auto flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-3 py-2.5 border-b border-gray-100">
              <div className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Week of {format(parseISO(weekOf), "MMM d")}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Ongoing tasks</div>
            </div>

            <div className="flex-1 p-2 space-y-1">
              {weekTasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    "flex items-start gap-2 p-2 rounded-lg group",
                    task.done ? "opacity-50" : ""
                  )}
                  style={{ borderLeft: `3px solid ${task.color}` }}
                >
                  <button onClick={() => toggleTaskDone(task)} className="mt-0.5 flex-shrink-0 text-gray-400 hover:text-gray-700">
                    {task.done ? <CheckSquare size={14} className="text-green-500" /> : <Square size={14} />}
                  </button>
                  <span className={cn("text-xs flex-1 leading-snug", task.done && "line-through text-gray-400")}>
                    {task.title}
                  </span>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-400 transition-opacity flex-shrink-0"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              ))}

              {showAddTask ? (
                <div className="p-2 border border-gray-200 rounded-lg space-y-2">
                  <input
                    autoFocus
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addTask(); if (e.key === "Escape") setShowAddTask(false); }}
                    placeholder="Task name..."
                    className="w-full text-xs px-2 py-1.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="flex gap-1 flex-wrap">
                    {TASK_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => setNewTaskColor(c)}
                        className="w-5 h-5 rounded-full border-2 transition-transform hover:scale-110"
                        style={{
                          backgroundColor: c,
                          borderColor: c === newTaskColor ? "#1f2937" : "transparent",
                        }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={addTask}
                      className="flex-1 px-2 py-1 bg-gray-900 text-white text-xs rounded-lg hover:bg-gray-700"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddTask(false)}
                      className="px-2 py-1 text-gray-400 text-xs hover:text-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddTask(true)}
                  className="flex items-center gap-1.5 w-full px-2 py-1.5 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <Plus size={12} />
                  Add task
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media print {
          nav, button, .no-print { display: none !important; }
          body { background: white; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}
