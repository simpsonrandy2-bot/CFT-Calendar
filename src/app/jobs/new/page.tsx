import { AuthWrapper } from "@/components/auth-wrapper";
import { JobForm } from "@/components/job-form";

export default function NewJobPage() {
  return (
    <AuthWrapper requireOffice>
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">New Job</h1>
        <JobForm mode="create" />
      </div>
    </AuthWrapper>
  );
}
