import { PageHeader } from "@/components/ui/primitives";
import { InviteStaffForm } from "./InviteStaffForm";

export default function InviteStaffPage() {
  return (
    <div>
      <PageHeader
        title="Invite staff"
        description="Create an invited account and send an accept-invite link. Locally, the link is logged instead of emailed."
      />
      <div className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
        <InviteStaffForm />
      </div>
    </div>
  );
}
