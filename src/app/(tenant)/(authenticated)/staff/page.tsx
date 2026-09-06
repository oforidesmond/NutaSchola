import { PageHeader } from "@/components/ui/primitives";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { StaffManager, type StaffRow } from "./StaffManager";

export default async function StaffPage() {
  const { user, tenant } = await requirePageAccess(ACTIONS.STAFF_INVITE);

  const users = await prisma.user.findMany({
    where: {
      schoolId: tenant.schoolId,
      deletedAt: null,
      role: { notIn: ["PARENT", "SUPER_ADMIN"] },
    },
    orderBy: [{ status: "asc" }, { lastName: "asc" }, { firstName: "asc" }],
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      status: true,
    },
  });

  const inviteEmails = users
    .filter((u) => u.status === "INVITED")
    .map((u) => `invite:${u.email.toLowerCase()}`);

  const now = new Date();
  const validInviteIds = new Set(
    inviteEmails.length === 0
      ? []
      : (
          await prisma.verificationToken.findMany({
            where: {
              identifier: { in: inviteEmails },
              expires: { gt: now },
            },
            select: { identifier: true },
          })
        ).map((t) => t.identifier),
  );

  const staff: StaffRow[] = users.map((row) => {
    let inviteState: StaffRow["inviteState"] = "active";
    if (row.status === "INACTIVE" || row.status === "SUSPENDED") {
      inviteState = "inactive";
    } else if (row.status === "INVITED") {
      inviteState = validInviteIds.has(`invite:${row.email.toLowerCase()}`)
        ? "pending"
        : "expired";
    }

    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      status: row.status,
      inviteState,
      isSelf: row.id === user.id,
    };
  });

  return (
    <div>
      <PageHeader
        title="Staff"
        description="Invite colleagues, manage pending invites, and deactivate accounts when needed."
      />
      <StaffManager staff={staff} />
    </div>
  );
}
