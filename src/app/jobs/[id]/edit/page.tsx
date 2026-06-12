import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AuthWrapper } from "@/components/auth-wrapper";
import { JobForm } from "@/components/job-form";

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) notFound();

  return (
    <AuthWrapper requireOffice>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Job</h1>
        <JobForm
          mode="edit"
          initialData={{
            id: job.id,
            jobNumber: job.jobNumber,
            title: job.title,
            customer: job.customer,
            jobType: job.jobType,
            address: job.address,
            jobLead: job.jobLead,
            siteContact: job.siteContact,
            startDate: job.startDate.toISOString(),
            endDate: job.endDate.toISOString(),
            startTime: job.startTime || "",
            description: job.description,
            colorTag: job.colorTag,
            legacyJobUrl: job.legacyJobUrl || "",
          }}
        />
      </div>
    </AuthWrapper>
  );
}
