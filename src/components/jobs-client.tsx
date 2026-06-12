"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateRange, DEFAULT_CREW_MEMBERS, DEFAULT_JOB_TYPES } from "@/lib/utils";
import { Search, Filter, ChevronRight } from "lucide-react";

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

export function JobsClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLead, setFilterLead] = useState("");
  const [filterType, setFilterType] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (filterLead) params.set("jobLead", filterLead);
    if (filterType) params.set("jobType", filterType);

    const timeout = setTimeout(() => {
      fetch(`/api/jobs?${params}`)
        .then((r) => r.json())
        .then((data) => { setJobs(Array.isArray(data) ? data : []); setLoading(false); });
    }, 300);
    return () => clearTimeout(timeout);
  }, [search, filterLead, filterType]);

  return (
    <>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs, customers, addresses..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`p-2.5 rounded-xl border transition-colors ${showFilters ? "bg-blue-600 text-white border-blue-600" : "bg-white border-gray-200 text-gray-600"}`}
        >
          <Filter size={18} />
        </button>
      </div>

      {showFilters && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <select
            value={filterLead}
            onChange={(e) => setFilterLead(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm"
          >
            <option value="">All Leads</option>
            {DEFAULT_CREW_MEMBERS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-xl bg-white text-sm"
          >
            <option value="">All Types</option>
            {DEFAULT_JOB_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-20 bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg font-medium">No jobs found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-3 hover:border-gray-300 hover:shadow-sm transition-all"
            >
              <div
                className="w-3 h-12 rounded-full flex-shrink-0"
                style={{ backgroundColor: job.colorTag }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  {job.jobNumber && (
                    <span className="text-xs font-mono text-gray-400">#{job.jobNumber}</span>
                  )}
                  {job.jobType && (
                    <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                      {job.jobType}
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gray-900 truncate text-sm">{job.title}</p>
                <p className="text-xs text-gray-500 truncate">
                  {formatDateRange(job.startDate, job.endDate)}
                  {job.jobLead && ` · ${job.jobLead}`}
                </p>
              </div>
              {job.photos?.length > 0 && (
                <span className="text-xs text-gray-400 flex-shrink-0">📷 {job.photos.length}</span>
              )}
              <ChevronRight size={16} className="text-gray-300 flex-shrink-0" />
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
