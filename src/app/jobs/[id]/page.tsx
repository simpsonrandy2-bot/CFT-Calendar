export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { AuthWrapper } from "@/components/auth-wrapper";
import { PhotoGallery } from "@/components/photo-gallery";
import { formatDateRange } from "@/lib/utils";
import { ExternalLink, Edit, MapPin, User, Phone, Clock } from "lucide-react";

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session.isLoggedIn) redirect("/login");

  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: { photos: { orderBy: { uploadedAt: "desc" } } },
  });
  if (!job) notFound();

  const isOffice = session.role === "office";

  return (
    <AuthWrapper>
      <div className="max-w-2xl">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              {job.jobNumber && (
                <span className="text-sm font-mono bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                  #{job.jobNumber}
                </span>
              )}
              {job.jobType && (
                <span className="text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-medium">
                  {job.jobType}
                </span>
              )}
            </div>
            <h1 className="text-xl font-bold text-gray-900 leading-tight">{job.title}</h1>
            {job.customer && (
              <p className="text-gray-500 mt-0.5">{job.customer}</p>
            )}
          </div>
          <div
            className="w-5 h-5 rounded-full mt-1 flex-shrink-0 border border-white shadow"
            style={{ backgroundColor: job.colorTag }}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 mb-4">
          <div className="px-4 py-3 flex items-start gap-3">
            <Clock size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
            <div>
              <span className="font-medium">{formatDateRange(job.startDate, job.endDate)}</span>
              {job.startTime && <span className="text-gray-500 ml-2">@ {job.startTime}</span>}
            </div>
          </div>
          {job.address && (
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(job.address)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-3 flex items-start gap-3 hover:bg-green-50 transition-colors group"
            >
              <MapPin size={16} className="text-gray-400 mt-0.5 flex-shrink-0 group-hover:text-green-600" />
              <span className="group-hover:text-green-700 group-hover:underline">{job.address}</span>
            </a>
          )}
          {job.jobLead && (
            <div className="px-4 py-3 flex items-start gap-3">
              <User size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <span><span className="text-gray-500">Lead:</span> {job.jobLead}</span>
            </div>
          )}
          {job.siteContact && (
            <div className="px-4 py-3 flex items-start gap-3">
              <Phone size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
              <span>{job.siteContact}</span>
            </div>
          )}
        </div>

        {job.description && (
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Notes</h2>
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-800 leading-relaxed">
              {job.description}
            </pre>
          </div>
        )}

        {job.legacyJobUrl && (
          <a
            href={job.legacyJobUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-3 bg-blue-50 text-blue-700 rounded-xl mb-4 font-medium hover:bg-blue-100 transition-colors"
          >
            <ExternalLink size={16} />
            View Legacy Job Profile
          </a>
        )}

        {isOffice && (
          <Link
            href={`/jobs/${job.id}/edit`}
            className="flex items-center justify-center gap-2 w-full py-3 bg-gray-900 text-white rounded-xl font-semibold mb-6 hover:bg-gray-800 transition-colors"
          >
            <Edit size={16} />
            Edit Job
          </Link>
        )}

        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">
            Photos ({job.photos.length})
          </h2>
          <PhotoGallery
            photos={job.photos.map((p) => ({
              ...p,
              uploadedAt: p.uploadedAt.toISOString(),
            }))}
            jobId={job.id}
            canDelete={isOffice}
          />
        </div>
      </div>
    </AuthWrapper>
  );
}
