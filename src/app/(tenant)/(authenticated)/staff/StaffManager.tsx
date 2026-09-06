"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, StatusBadge } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  inviteStaffAction,
  resendInviteAction,
  revokeInviteAction,
  setStaffActiveAction,
} from "./actions";
import type { UserRole } from "@prisma/client";

const INVITE_ROLES: { value: UserRole; label: string }[] = [
  { value: "SCHOOL_ADMIN", label: "School admin" },
  { value: "ADMISSIONS_OFFICER", label: "Admissions officer" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "TEACHER", label: "Teacher" },
  { value: "FRONT_DESK", label: "Front desk" },
  { value: "IT_SUPPORT", label: "IT support" },
];

const ROLE_LABELS: Partial<Record<UserRole, string>> = Object.fromEntries(
  INVITE_ROLES.map((r) => [r.value, r.label]),
);
ROLE_LABELS.SCHOOL_OWNER = "School owner";

export type StaffRow = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: "ACTIVE" | "INACTIVE" | "INVITED" | "SUSPENDED";
  inviteState: "active" | "pending" | "expired" | "inactive";
  isSelf: boolean;
};

type ConfirmState =
  | { kind: "revoke"; user: StaffRow }
  | { kind: "deactivate"; user: StaffRow }
  | { kind: "reactivate"; user: StaffRow }
  | null;

export function StaffManager({ staff }: { staff: StaffRow[] }) {
  const router = useRouter();
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rowLoading, setRowLoading] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function onInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setInviteLoading(true);
    setInviteError(null);
    setInviteMessage(null);

    const form = new FormData(event.currentTarget);
    const result = await inviteStaffAction({
      email: String(form.get("email") ?? ""),
      firstName: String(form.get("firstName") ?? ""),
      lastName: String(form.get("lastName") ?? ""),
      role: String(form.get("role") ?? "FRONT_DESK") as UserRole,
    });

    setInviteLoading(false);
    if (!result.ok) {
      setInviteError(result.error.message);
      return;
    }
    setInviteMessage("Invite sent. They will receive an email to set their password.");
    event.currentTarget.reset();
    router.refresh();
  }

  async function onResend(user: StaffRow) {
    setRowLoading(user.id);
    setActionError(null);
    const result = await resendInviteAction(user.id);
    setRowLoading(null);
    if (!result.ok) {
      setActionError(result.error.message);
      return;
    }
    router.refresh();
  }

  async function runConfirmed() {
    if (!confirm) return;
    setConfirmLoading(true);
    setActionError(null);

    let result;
    if (confirm.kind === "revoke") {
      result = await revokeInviteAction(confirm.user.id);
    } else if (confirm.kind === "deactivate") {
      result = await setStaffActiveAction(confirm.user.id, false);
    } else {
      result = await setStaffActiveAction(confirm.user.id, true);
    }

    setConfirmLoading(false);
    if (!result.ok) {
      setActionError(result.error.message);
      setConfirm(null);
      return;
    }
    setConfirm(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-8">
      <section className="surface-raised p-6">
        <h2 className="mb-1 text-[18px] font-semibold text-[var(--gray-900)]">Invite staff</h2>
        <p className="mb-4 text-[15px] text-[var(--gray-600)]">
          They receive an email with a link to set their own password (expires in 48 hours).
        </p>
        <form onSubmit={onInvite} className="flex max-w-2xl flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="First name" name="firstName" required />
            <Input label="Last name" name="lastName" required />
          </div>
          <Input label="Email" name="email" type="email" required />
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Role</span>
            <select
              name="role"
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base shadow-[var(--shadow-sm)]"
              defaultValue="FRONT_DESK"
            >
              {INVITE_ROLES.map((role) => (
                <option key={role.value} value={role.value}>
                  {role.label}
                </option>
              ))}
            </select>
          </label>
          {inviteError ? (
            <p className="rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
              {inviteError}
            </p>
          ) : null}
          {inviteMessage ? (
            <p className="rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
              {inviteMessage}
            </p>
          ) : null}
          <Button type="submit" loading={inviteLoading} className="self-start">
            Send invite
          </Button>
        </form>
      </section>

      <section className="surface-raised overflow-hidden">
        <div className="border-b border-[var(--gray-200)] px-6 py-4">
          <h2 className="text-[18px] font-semibold text-[var(--gray-900)]">All staff</h2>
          <p className="text-[15px] text-[var(--gray-600)]">
            Active accounts, pending invites, and expired invites for this school.
          </p>
        </div>
        {actionError ? (
          <p className="mx-6 mt-4 rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
            {actionError}
          </p>
        ) : null}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[15px]">
            <thead className="bg-[var(--gray-50)] text-[13px] uppercase tracking-wide text-[var(--gray-500)]">
              <tr>
                <th className="px-6 py-3 font-semibold">Name</th>
                <th className="px-6 py-3 font-semibold">Role</th>
                <th className="px-6 py-3 font-semibold">Status</th>
                <th className="px-6 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-[var(--gray-500)]">
                    No staff yet. Send an invite above.
                  </td>
                </tr>
              ) : (
                staff.map((row) => (
                  <tr key={row.id} className="interactive-row border-t border-[var(--gray-100)]">
                    <td className="px-6 py-3">
                      <p className="font-medium text-[var(--gray-900)]">
                        {row.firstName} {row.lastName}
                        {row.isSelf ? (
                          <span className="ml-2 text-[13px] font-normal text-[var(--gray-500)]">
                            (you)
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[13px] text-[var(--gray-500)]">{row.email}</p>
                    </td>
                    <td className="px-6 py-3 text-[var(--gray-700)]">
                      {ROLE_LABELS[row.role] ?? row.role}
                    </td>
                    <td className="px-6 py-3">
                      <StaffStatusBadge state={row.inviteState} />
                    </td>
                    <td className="px-6 py-3">
                      <StaffRowActions
                        row={row}
                        loading={rowLoading === row.id}
                        onResend={() => onResend(row)}
                        onRevoke={() => setConfirm({ kind: "revoke", user: row })}
                        onDeactivate={() => setConfirm({ kind: "deactivate", user: row })}
                        onReactivate={() => setConfirm({ kind: "reactivate", user: row })}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <ConfirmDialog
        open={confirm?.kind === "revoke"}
        title="Revoke invite?"
        consequence={`This cancels the pending invite for ${confirm?.user.email ?? ""}. They will no longer be able to use the invite link. You can invite them again later.`}
        confirmLabel="Revoke invite"
        destructive
        loading={confirmLoading}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "deactivate"}
        title="Deactivate staff?"
        consequence={`${confirm?.user.firstName ?? ""} ${confirm?.user.lastName ?? ""} will not be able to sign in. Their records and history stay in the system. You can reactivate them later.`}
        confirmLabel="Deactivate"
        destructive
        loading={confirmLoading}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
      <ConfirmDialog
        open={confirm?.kind === "reactivate"}
        title="Reactivate staff?"
        consequence={`${confirm?.user.firstName ?? ""} ${confirm?.user.lastName ?? ""} will be able to sign in again with their existing password.`}
        confirmLabel="Reactivate"
        loading={confirmLoading}
        onConfirm={runConfirmed}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}

function StaffStatusBadge({ state }: { state: StaffRow["inviteState"] }) {
  if (state === "active") return <StatusBadge label="Active" tone="success" />;
  if (state === "pending") return <StatusBadge label="Invited (pending)" tone="info" />;
  if (state === "expired") return <StatusBadge label="Invite expired" tone="warning" />;
  return <StatusBadge label="Inactive" tone="neutral" />;
}

function StaffRowActions({
  row,
  loading,
  onResend,
  onRevoke,
  onDeactivate,
  onReactivate,
}: {
  row: StaffRow;
  loading: boolean;
  onResend: () => void;
  onRevoke: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
}) {
  if (row.inviteState === "pending" || row.inviteState === "expired") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" loading={loading} onClick={onResend}>
          Resend invite
        </Button>
        <Button type="button" variant="ghost" disabled={loading} onClick={onRevoke}>
          Revoke
        </Button>
      </div>
    );
  }

  if (row.inviteState === "inactive") {
    return (
      <Button type="button" variant="secondary" disabled={row.isSelf} onClick={onReactivate}>
        Reactivate
      </Button>
    );
  }

  if (row.isSelf) {
    return <span className="text-[13px] text-[var(--gray-500)]">—</span>;
  }

  return (
    <Button type="button" variant="ghost" onClick={onDeactivate}>
      Deactivate
    </Button>
  );
}
