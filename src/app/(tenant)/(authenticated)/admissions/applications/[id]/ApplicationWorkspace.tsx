"use client";

import { FormEvent, useState } from "react";
import type { AdmissionStage, Gender } from "@prisma/client";
import { ArrowRight } from "lucide-react";
import { Button, Input, Textarea } from "@/components/ui/primitives";
import { Card } from "@/components/ui/Card";
import { GENDER_LABELS } from "@/lib/admissions/labels";
import { admissionStageLabel } from "@/lib/admissions/stages";
import { getAdmissionNextAction } from "@/lib/admissions/next-action";
import { formatDateAccra } from "@/lib/format/currency";
import { updateApplicationBio } from "./actions";
import { GuardiansPanel, type GuardianRow } from "./GuardiansPanel";
import { DocumentsPanel, type DocumentRow } from "./DocumentsPanel";
import { StageChangePanel } from "./StageChangePanel";
import { FeePanel, type InvoiceView } from "./FeePanel";
import { ConvertPanel, DangerZone } from "./ConvertAndDangerPanel";
import type { ReportSchoolBrand } from "@/lib/reports/types";
import type { ReceiptApplicant } from "@/lib/receipts/types";

type ApplicationBio = {
  id: string;
  applicationNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  nationality: string | null;
  religion: string | null;
  homeAddress: string | null;
  photoUrl: string | null;
  previousSchoolName: string | null;
  previousClassCompleted: string | null;
  stage: AdmissionStage;
  classLevelAppliedName: string;
  academicYearName: string;
  rejectionReason: string | null;
  decisionNotes: string | null;
  convertedStudent: { id: string; admissionNumber: string } | null;
};

type StatusHistoryRow = {
  id: string;
  fromStage: AdmissionStage | null;
  toStage: AdmissionStage;
  note: string | null;
  createdAt: string;
};

export function ApplicationWorkspace({
  application,
  guardians,
  documents,
  statusHistory,
  invoice,
  school,
  applicant,
  canConvert,
  convertBlockedReason,
  alreadyConverted,
  permissions,
}: {
  application: ApplicationBio;
  guardians: GuardianRow[];
  documents: DocumentRow[];
  statusHistory: StatusHistoryRow[];
  invoice: InvoiceView;
  school: ReportSchoolBrand;
  applicant: ReceiptApplicant;
  canConvert: boolean;
  convertBlockedReason: string | null;
  alreadyConverted: boolean;
  permissions: {
    canUpdate: boolean;
    canStage: boolean;
    canDocuments: boolean;
    canFees: boolean;
    canConvertAction: boolean;
  };
}) {
  const nextAction = getAdmissionNextAction({
    stage: application.stage,
    guardianCount: guardians.length,
    uploadedDocumentTypes: documents.map((d) => d.type),
    hasInvoice: Boolean(invoice),
    amountPaid: invoice ? Number(invoice.amountPaid) : 0,
    canConvert: canConvert && permissions.canConvertAction,
    alreadyConverted,
    convertBlockedReason,
  });

  return (
    <div className="flex flex-col gap-6">
      <Card
        variant={nextAction.focus === "none" ? "flat" : "emphasis"}
        className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
      >
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-[0.02em] text-[var(--brand-700)]">
            What&apos;s next
          </p>
          <h2 className="mt-1 text-[20px] font-semibold text-[var(--gray-900)]">{nextAction.title}</h2>
          <p className="mt-1 max-w-2xl text-[15px] text-[var(--gray-700)]">{nextAction.description}</p>
        </div>
        {nextAction.ctaLabel ? (
          <p className="inline-flex items-center gap-1.5 text-[14px] font-medium text-[var(--brand-700)]">
            <ArrowRight className="h-4 w-4" aria-hidden />
            {nextAction.ctaLabel} below
          </p>
        ) : null}
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <StageChangePanel
          applicationId={application.id}
          currentStage={application.stage}
          alreadyConverted={alreadyConverted}
          emphasized={nextAction.focus === "stage"}
          readOnly={!permissions.canStage}
        />
        <FeePanel
          applicationId={application.id}
          invoice={invoice}
          school={school}
          applicant={applicant}
          emphasized={nextAction.focus === "fee"}
          readOnly={!permissions.canFees}
        />
      </div>

      {permissions.canConvertAction &&
      (canConvert || alreadyConverted || nextAction.focus === "convert") ? (
        <ConvertPanel
          applicationId={application.id}
          canConvert={canConvert}
          convertBlockedReason={convertBlockedReason}
          alreadyConverted={alreadyConverted}
          convertedStudent={application.convertedStudent}
          emphasized={canConvert || nextAction.focus === "convert"}
        />
      ) : alreadyConverted ? (
        <ConvertPanel
          applicationId={application.id}
          canConvert={false}
          convertBlockedReason={null}
          alreadyConverted={alreadyConverted}
          convertedStudent={application.convertedStudent}
        />
      ) : null}

      <BioSection application={application} readOnly={!permissions.canUpdate} />

      <div className="grid gap-6 lg:grid-cols-2">
        <GuardiansPanel
          applicationId={application.id}
          guardians={guardians}
          readOnly={!permissions.canUpdate}
        />
        <DocumentsPanel
          applicationId={application.id}
          documents={documents}
          readOnly={!permissions.canDocuments}
        />
      </div>

      <StatusHistoryPanel history={statusHistory} />

      {!alreadyConverted && permissions.canUpdate ? (
        <DangerZone applicationId={application.id} />
      ) : null}
    </div>
  );
}

function BioSection({
  application,
  readOnly = false,
}: {
  application: ApplicationBio;
  readOnly?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const result = await updateApplicationBio(new FormData(event.currentTarget));
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setMessage("Bio-data updated.");
    setEditing(false);
  }

  return (
    <section className="surface-raised p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-4">
          {application.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={application.photoUrl}
              alt={`${application.firstName} ${application.lastName}`}
              className="h-16 w-16 rounded-full border border-[var(--gray-200)] object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--gray-200)] text-[20px] font-semibold text-[var(--gray-600)]">
              {application.firstName[0]}
              {application.lastName[0]}
            </div>
          )}
          <div>
            <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Applicant bio-data</h2>
            <p className="text-[15px] text-[var(--gray-600)]">
              {application.applicationNumber} · {application.classLevelAppliedName} ·{" "}
              {application.academicYearName}
            </p>
          </div>
        </div>
        {!readOnly ? (
          <Button type="button" variant="secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit bio-data"}
          </Button>
        ) : null}
      </div>

      {message ? (
        <p className="mt-4 rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}

      {editing && !readOnly ? (
        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="applicationId" value={application.id} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="First name" name="firstName" defaultValue={application.firstName} required />
            <Input label="Middle name" name="middleName" defaultValue={application.middleName ?? ""} />
            <Input label="Last name" name="lastName" defaultValue={application.lastName} required />
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Input
              label="Date of birth"
              name="dateOfBirth"
              type="date"
              defaultValue={application.dateOfBirth}
              required
            />
            <label className="flex flex-col gap-2">
              <span className="text-[15px] font-medium text-[var(--gray-800)]">Gender</span>
              <select
                name="gender"
                defaultValue={application.gender}
                required
                className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
              >
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
              </select>
            </label>
            <Input label="Nationality" name="nationality" defaultValue={application.nationality ?? ""} />
          </div>
          <Input label="Religion" name="religion" defaultValue={application.religion ?? ""} />
          <Textarea label="Home address" name="homeAddress" defaultValue={application.homeAddress ?? ""} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Previous school name"
              name="previousSchoolName"
              defaultValue={application.previousSchoolName ?? ""}
            />
            <Input
              label="Previous class completed"
              name="previousClassCompleted"
              defaultValue={application.previousClassCompleted ?? ""}
            />
          </div>
          <Button type="submit" loading={loading} className="self-start">
            Save bio-data
          </Button>
        </form>
      ) : (
        <dl className="mt-5 grid gap-x-6 gap-y-3 text-[15px] sm:grid-cols-2">
          <Field label="Date of birth" value={formatDateAccra(application.dateOfBirth)} />
          <Field label="Gender" value={GENDER_LABELS[application.gender]} />
          <Field label="Nationality" value={application.nationality ?? "—"} />
          <Field label="Religion" value={application.religion ?? "—"} />
          <Field label="Home address" value={application.homeAddress ?? "—"} full />
          <Field label="Previous school" value={application.previousSchoolName ?? "—"} />
          <Field label="Previous class completed" value={application.previousClassCompleted ?? "—"} />
          {application.rejectionReason ? (
            <Field label="Rejection reason" value={application.rejectionReason} full />
          ) : null}
        </dl>
      )}
    </section>
  );
}

function Field({ label, value, full }: { label: string; value: string; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <dt className="text-[13px] font-medium uppercase tracking-[0.02em] text-[var(--gray-500)]">
        {label}
      </dt>
      <dd className="mt-1 text-[var(--gray-900)]">{value}</dd>
    </div>
  );
}

function StatusHistoryPanel({ history }: { history: StatusHistoryRow[] }) {
  return (
    <section className="surface-flat p-6">
      <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Status history</h2>
      {history.length === 0 ? (
        <p className="mt-3 text-[15px] text-[var(--gray-600)]">No stage changes recorded yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--gray-100)]">
          {history.map((entry) => (
            <li key={entry.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
              <div>
                <p className="text-[15px] font-medium text-[var(--gray-900)]">
                  {entry.fromStage ? `${admissionStageLabel(entry.fromStage)} → ` : ""}
                  {admissionStageLabel(entry.toStage)}
                </p>
                {entry.note ? (
                  <p className="mt-1 text-[13px] text-[var(--gray-600)]">{entry.note}</p>
                ) : null}
              </div>
              <p className="font-variant-numeric tabular-nums text-[13px] text-[var(--gray-500)]">
                {formatDateAccra(entry.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
