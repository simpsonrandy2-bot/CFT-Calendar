"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DateDisplay } from "@/components/date-display";
import { Camera, ChevronRight, CalendarDays, Clock, CheckCircle2 } from "lucide-react";

interface Job {
  id: string;
  jobNumber: string;
  title: string;
  customer: string;
  jobType: string;
  address: string;
  jobLead: string;
  startDate: string;
  endDate: string;
  colorTag: string;
  photos: { id: string }[];
}

type Groups = { thisWeek: Job[]; nextMonth: Job[]; past: Job[] };

function groupJobs(jobs: Job[]): Groups {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const in7 = new Date(now); in7.setDate(now.getDate() + 7);
  const in30 = new Date(now); in30.setDate(now.getDate() + 30);

  const thisWeek: Job[] = [], nextMonth: Job[] = [], past: Job[] = [];
  for (const job of jobs) {
    const start = new Date(job.startDate);
    start.setHours(0, 0, 0, 0);
    if (start < now) past.push(job);
    else if (start <= in7) thisWeek.push(job);
    else if (start <= in30) nextMonth.push(job);
  }
  return { thisWeek, nextMonth, past };
}

function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 p-3 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: job.colorTag }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          {job.jobType && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{job.jobType}</span>
          )}
          {job.jobNumber && (
            <span className="text-xs font-mono text-gray-400">#{job.jobNumber}</span>
          )}
        </div>
        <p className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2">{job.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          <DateDisplay start={job.startDate} end={job.endDate} />
          {job.jobLead && <span className="text-gray-400"> · {job.jobLead}</span>}
        </p>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        {job.photos?.length > 0 && (
          <span className="flex items-center gap-0.5 text-xs text-gray-400">
            <Camera size={11} /> {job.photos.length}
          </span>
        )}
        <ChevronRight size={14} className="text-gray-300" />
      </div>
    </Link>
  );
}

const COLUMNS = [
  { key: "thisWeek" as const, label: "This Week", icon: CalendarDays, color: "text-orange-500", border: "border-orange-400", bg: "bg-orange-50" },
  { key: "nextMonth" as const, label: "Next 30 Days", icon: Clock, color: "text-blue-500", border: "border-blue-400", bg: "bg-blue-50" },
  { key: "past" as const, label: "Past Jobs", icon: CheckCircle2, color: "text-gray-400", border: "border-gray-300", bg: "bg-gray-50" },
];

export function JobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    fetch(`/api/jobs?startDate=${start}&startDateEnd=${end}`)
      .then((r) => r.json())
      .then((data) => { setJobs(Array.isArray(data) ? data : []); setLoading(false); });
  }, []);

  const groups = groupJobs(jobs);

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-4">Jobs</h1>

      <div className="grid grid-cols-3 gap-4">
        {COLUMNS.map(({ key, label, icon: Icon, color, border, bg }) => (
          <div key={key} className="flex flex-col">
            {/* Column header */}
            <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl border-t-2 border-x border-b ${border} border-b-gray-200 ${bg} mb-0`}>
              <Icon size={15} className={color} />
              <span className="text-sm font-semibold text-gray-700">{label}</span>
              <span className={`ml-auto text-xs font-medium px-1.5 py-0.5 rounded-full bg-white ${color}`}>
                {loading ? "…" : groups[key].length}
              </span>
            </div>

            {/* Job list */}
            <div className="flex flex-col gap-2 pt-2">
              {loading ? (
                [1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-200 rounded-xl animate-pulse" />)
              ) : groups[key].length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-xs">None</div>
              ) : (
                groups[key].map(job => <JobCard key={job.id} job={job} />)
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
