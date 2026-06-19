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

type Group = { label: string; jobs: Job[] };

function groupJobs(jobs: Job[]): Group[] {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const in7 = new Date(now); in7.setDate(now.getDate() + 7);
  const in30 = new Date(now); in30.setDate(now.getDate() + 30);

  const thisWeek: Job[] = [], nextMonth: Job[] = [], past: Job[] = [];

  for (const job of jobs) {
    const start = new Date(job.startDate);
    start.setHours(0, 0, 0, 0);
    if (start < now) {
      past.push(job);
    } else if (start <= in7) {
      thisWeek.push(job);
    } else if (start <= in30) {
      nextMonth.push(job);
    }
  }

  const groups: Group[] = [];
  if (thisWeek.length) groups.push({ label: "This Week", jobs: thisWeek });
  if (nextMonth.length) groups.push({ label: "Next 30 Days", jobs: nextMonth });
  if (past.length) groups.push({ label: "Past Jobs", jobs: past });
  return groups;
}

function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 hover:border-gray-300 hover:shadow-sm transition-all"
    >
      <div className="w-1 self-stretch rounded-full flex-shrink-0" style={{ backgroundColor: job.colorTag }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          {job.jobType && (
            <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">{job.jobType}</span>
          )}
          {job.jobNumber && (
            <span className="text-xs font-mono text-gray-400">#{job.jobNumber}</span>
          )}
        </div>
        <p className="font-semibold text-gray-900 truncate text-sm">{job.title}</p>
        <p className="text-xs text-gray-500 mt-0.5">
          <DateDisplay start={job.startDate} end={job.endDate} />
          {job.jobLead && <span className="text-gray-400"> · {job.jobLead}</span>}
        </p>
      </div>
      {job.photos?.length > 0 && (
        <span className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
          <Camera size={12} /> {job.photos.length}
        </span>
      )}
      <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
    </Link>
  );
}

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

  const ICONS: Record<string, React.ReactNode> = {
    "This Week": <CalendarDays size={15} className="text-orange-500" />,
    "Next 30 Days": <Clock size={15} className="text-blue-500" />,
    "Past Jobs": <CheckCircle2 size={15} className="text-gray-400" />,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-gray-900">Jobs</h1>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />)}
        </div>
      ) : groups.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CalendarDays size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No jobs in the next 30 days</p>
        </div>
      ) : groups.map(group => (
        <div key={group.label}>
          <div className="flex items-center gap-2 mb-2">
            {ICONS[group.label]}
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">{group.label}</h2>
            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{group.jobs.length}</span>
          </div>
          <div className="space-y-2">
            {group.jobs.map(job => <JobCard key={job.id} job={job} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
