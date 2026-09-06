"use client";

import { FormEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DocumentType } from "@prisma/client";
import { Button } from "@/components/ui/primitives";
import { APPLICATION_DOCUMENT_TYPES, DOCUMENT_TYPE_LABELS } from "@/lib/admissions/labels";
import { formatDateAccra } from "@/lib/format/currency";

export type DocumentRow = {
  id: string;
  type: DocumentType;
  fileName: string;
  blobUrl: string;
  createdAt: string;
};

export function DocumentsPanel({
  applicationId,
  documents,
  readOnly = false,
}: {
  applicationId: string;
  documents: DocumentRow[];
  readOnly?: boolean;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const form = event.currentTarget;
    const response = await fetch(`/api/admissions/applications/${applicationId}/documents`, {
      method: "POST",
      body: new FormData(form),
    });
    const result = (await response.json()) as
      | { ok: true; data: { id: string } }
      | { ok: false; error: { message: string } };
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    formRef.current?.reset();
    setMessage("Document uploaded.");
    router.refresh();
  }

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]">
      <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Documents</h2>

      {documents.length === 0 ? (
        <p className="mt-3 text-[15px] text-[var(--gray-600)]">No documents uploaded yet.</p>
      ) : (
        <ul className="mt-4 divide-y divide-[var(--gray-100)]">
          {documents.map((doc) => (
            <li key={doc.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
              <div>
                <p className="text-[15px] font-medium text-[var(--gray-900)]">
                  {DOCUMENT_TYPE_LABELS[doc.type]}
                </p>
                <p className="text-[13px] text-[var(--gray-600)]">
                  {doc.fileName} · {formatDateAccra(doc.createdAt)}
                </p>
              </div>
              <a
                href={doc.blobUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] px-3 text-[15px] font-semibold text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
              >
                View
              </a>
            </li>
          ))}
        </ul>
      )}

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

      {!readOnly ? (
        <form
          ref={formRef}
          onSubmit={onSubmit}
          className="mt-5 flex flex-col gap-4 border-t border-[var(--gray-100)] pt-5"
        >
          <input type="hidden" name="applicationId" value={applicationId} />
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Document type</span>
            <select
              name="documentType"
              required
              defaultValue={APPLICATION_DOCUMENT_TYPES[0].value}
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 text-base"
            >
              {APPLICATION_DOCUMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">File</span>
            <input
              type="file"
              name="file"
              required
              accept="image/*,application/pdf"
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-[var(--white)] px-3 py-2 text-base"
            />
          </label>
          <Button type="submit" loading={loading} className="self-start">
            Upload document
          </Button>
        </form>
      ) : null}
    </section>
  );
}
