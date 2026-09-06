"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Button, Input, Textarea } from "@/components/ui/primitives";
import { Card } from "@/components/ui/Card";
import { updateSchoolSettings } from "./actions";

type SchoolSettingsFormProps = {
  school: {
    name: string;
    address: string | null;
    city: string | null;
    region: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
  };
  settings: {
    admissionNumberPrefix: string;
    applicationNumberPrefix: string;
    enableOnlineApplication: boolean;
    enableSmsNotifications: boolean;
    enableEmailNotifications: boolean;
  };
  currentAcademicYearName: string | null;
  readOnly?: boolean;
};

export function SchoolSettingsForm({
  school,
  settings,
  currentAcademicYearName,
  readOnly = false,
}: SchoolSettingsFormProps) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readOnly) return;
    setLoading(true);
    setMessage(null);
    setError(null);

    const result = await updateSchoolSettings(new FormData(event.currentTarget));
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    setMessage("Settings saved.");
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-2xl flex-col gap-6">
      <Card>
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">School profile</h2>
        <p className="mt-1 text-[15px] text-[var(--gray-600)]">
          Details shown on letters and staff screens for Excellence Kids.
        </p>
        <div className="mt-5 grid gap-4">
          <Input
            label="School name"
            name="name"
            defaultValue={school.name}
            required
            disabled={readOnly}
          />
          <Textarea
            label="Address"
            name="address"
            defaultValue={school.address ?? ""}
            placeholder="Street address"
            disabled={readOnly}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="City" name="city" defaultValue={school.city ?? ""} disabled={readOnly} />
            <Input
              label="Region"
              name="region"
              defaultValue={school.region ?? ""}
              placeholder="e.g. Greater Accra"
              disabled={readOnly}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Contact email"
              name="contactEmail"
              type="email"
              defaultValue={school.contactEmail ?? ""}
              disabled={readOnly}
            />
            <Input
              label="Contact phone"
              name="contactPhone"
              defaultValue={school.contactPhone ?? ""}
              placeholder="+233…"
              disabled={readOnly}
            />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">
          Numbering & notifications
        </h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Input
            label="Admission number prefix"
            name="admissionNumberPrefix"
            defaultValue={settings.admissionNumberPrefix}
            required
            disabled={readOnly}
          />
          <Input
            label="Application number prefix"
            name="applicationNumberPrefix"
            defaultValue={settings.applicationNumberPrefix}
            required
            disabled={readOnly}
          />
        </div>
        <div className="mt-5 space-y-3">
          <label className="flex min-h-11 items-center gap-3 text-[15px] text-[var(--gray-800)]">
            <input
              type="checkbox"
              name="enableEmailNotifications"
              defaultChecked={settings.enableEmailNotifications}
              disabled={readOnly}
              className="size-4 rounded border-[var(--gray-300)] text-[var(--brand-600)] disabled:opacity-60"
            />
            Enable email notifications
          </label>
          <label className="flex min-h-11 items-center gap-3 text-[15px] text-[var(--gray-800)]">
            <input
              type="checkbox"
              name="enableSmsNotifications"
              defaultChecked={settings.enableSmsNotifications}
              disabled={readOnly}
              className="size-4 rounded border-[var(--gray-300)] text-[var(--brand-600)] disabled:opacity-60"
            />
            Enable SMS notifications
          </label>
        </div>
      </Card>

      <Card variant="emphasis">
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">
          Current academic year
        </h2>
        <p className="mt-2 text-base text-[var(--gray-700)]">
          {currentAcademicYearName ?? "No current year set"}
        </p>
        <p className="mt-1 text-[15px] text-[var(--gray-600)]">
          Manage years, terms, classes, and subjects from the Academic settings screens.
        </p>
        <Link
          href="/settings/academic"
          className="mt-3 inline-flex min-h-11 items-center text-[15px] font-semibold text-[var(--brand-700)] hover:underline"
        >
          Open academic years &amp; terms
        </Link>
      </Card>

      {error ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--error-50)] px-3 py-2 text-[15px] text-[var(--error-700)]">
          {error}
        </p>
      ) : null}
      {message ? (
        <p className="rounded-[var(--radius-sm)] bg-[var(--success-50)] px-3 py-2 text-[15px] text-[var(--success-700)]">
          {message}
        </p>
      ) : null}

      {!readOnly ? (
        <div className="flex flex-wrap items-center gap-3 border-t border-[var(--gray-200)] pt-4">
          <Button type="submit" loading={loading}>
            Save school settings
          </Button>
          <p className="text-[13px] text-[var(--gray-500)]">
            Saves profile, numbering, and notification preferences.
          </p>
        </div>
      ) : null}
    </form>
  );
}
