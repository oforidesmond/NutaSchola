"use client";

import { FormEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Gender } from "@prisma/client";
import { Button, Input } from "@/components/ui/primitives";
import { Select } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  deactivateStudentAction,
  reactivateStudentAction,
  updateStudentProfileAction,
} from "./actions";

type SectionOption = { id: string; name: string; classLevelId: string };
type ClassOption = { id: string; name: string };

const GENDER_OPTIONS = Object.values(Gender).map((g) => ({
  value: g,
  label: g === "MALE" ? "Male" : "Female",
}));

export function StudentProfileForm({
  student,
  classLevels,
  sections,
  canEdit,
}: {
  student: {
    id: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    dateOfBirth: string;
    gender: Gender;
    nationality: string | null;
    homeAddress: string | null;
    currentClassLevelId: string | null;
    currentSectionId: string | null;
    isActive: boolean;
  };
  classLevels: ClassOption[];
  sections: SectionOption[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState(
    student.currentClassLevelId ?? "",
  );
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [pending, startTransition] = useTransition();

  const sectionOptions = useMemo(() => {
    const filtered = sections.filter((s) => s.classLevelId === selectedClassId);
    return [
      { value: "", label: "No section" },
      ...filtered.map((s) => ({ value: s.id, label: s.name })),
    ];
  }, [sections, selectedClassId]);

  function fieldError(name: string): string | undefined {
    return fieldErrors[name]?.[0];
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canEdit) return;
    setLoading(true);
    setError(null);
    setFieldErrors({});
    setMessage(null);
    const result = await updateStudentProfileAction(new FormData(event.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      setFieldErrors(result.error.fieldErrors ?? {});
      return;
    }
    setMessage("Student profile saved.");
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      {message ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <input type="hidden" name="studentId" value={student.id} />
        <div className="grid gap-4 sm:grid-cols-3">
          <Input
            label="First name"
            name="firstName"
            defaultValue={student.firstName}
            required
            disabled={!canEdit}
            error={fieldError("firstName")}
          />
          <Input
            label="Middle name"
            name="middleName"
            defaultValue={student.middleName ?? ""}
            disabled={!canEdit}
          />
          <Input
            label="Last name"
            name="lastName"
            defaultValue={student.lastName}
            required
            disabled={!canEdit}
            error={fieldError("lastName")}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Date of birth"
            name="dateOfBirth"
            type="date"
            defaultValue={student.dateOfBirth}
            required
            disabled={!canEdit}
            error={fieldError("dateOfBirth")}
          />
          <Select
            label="Gender"
            name="gender"
            required
            defaultValue={student.gender}
            options={GENDER_OPTIONS}
            disabled={!canEdit}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            label="Nationality"
            name="nationality"
            defaultValue={student.nationality ?? ""}
            disabled={!canEdit}
          />
          <Input
            label="Home address"
            name="homeAddress"
            defaultValue={student.homeAddress ?? ""}
            disabled={!canEdit}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Class level"
            name="classLevelId"
            defaultValue={student.currentClassLevelId ?? ""}
            options={[
              { value: "", label: "Select class" },
              ...classLevels.map((c) => ({ value: c.id, label: c.name })),
            ]}
            disabled={!canEdit}
            onChange={(event) => setSelectedClassId(event.target.value)}
          />
          <Select
            key={`section-${selectedClassId}`}
            label="Section"
            name="sectionId"
            defaultValue={
              student.currentSectionId &&
              sections.some(
                (s) =>
                  s.id === student.currentSectionId &&
                  s.classLevelId === selectedClassId,
              )
                ? student.currentSectionId
                : ""
            }
            options={sectionOptions}
            disabled={!canEdit || !selectedClassId}
          />
        </div>
        {canEdit ? (
          <Button type="submit" loading={loading} className="self-start">
            Save profile
          </Button>
        ) : null}
      </form>

      {canEdit ? (
        <div className="border-t border-[var(--gray-100)] pt-6">
          <h3 className="text-[16px] font-semibold text-[var(--gray-900)]">
            {student.isActive ? "Deactivate student" : "Reactivate student"}
          </h3>
          <p className="mt-1 text-[15px] text-[var(--gray-600)]">
            {student.isActive
              ? "Deactivated students are hidden from the active list. Fee history is kept."
              : "Restore this student to the active list."}
          </p>
          {student.isActive ? (
            <Button
              type="button"
              variant="secondary"
              className="mt-3"
              onClick={() => setConfirmDeactivate(true)}
            >
              Deactivate student
            </Button>
          ) : (
            <Button
              type="button"
              className="mt-3"
              loading={pending}
              onClick={() => {
                startTransition(async () => {
                  setError(null);
                  const result = await reactivateStudentAction(student.id);
                  if (!result.ok) {
                    setError(result.error.message);
                    return;
                  }
                  setMessage("Student reactivated.");
                  router.refresh();
                });
              }}
            >
              Reactivate student
            </Button>
          )}
        </div>
      ) : null}

      {canEdit ? (
        <ConfirmDialog
          open={confirmDeactivate}
          title="Deactivate this student?"
          consequence="They will be hidden from the active students list. Fee and enrollment history remain."
          confirmLabel="Deactivate"
          destructive
          loading={pending}
          onCancel={() => setConfirmDeactivate(false)}
          onConfirm={() => {
            startTransition(async () => {
              const result = await deactivateStudentAction(student.id);
              setConfirmDeactivate(false);
              if (!result.ok) {
                setError(result.error.message);
                return;
              }
              setMessage("Student deactivated.");
              router.refresh();
            });
          }}
        />
      ) : null}
    </div>
  );
}
