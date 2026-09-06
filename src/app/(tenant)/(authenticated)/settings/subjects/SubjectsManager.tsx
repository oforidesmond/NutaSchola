"use client";

import { FormEvent, useState, useTransition } from "react";
import { Pencil, Trash2, X } from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createSubject, deleteSubject, updateSubject } from "./actions";

type SubjectRow = { id: string; name: string; code: string | null };

export function SubjectsManager({ subjects }: { subjects: SubjectRow[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<SubjectRow | null>(null);
  const [pending, startTransition] = useTransition();

  async function onCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const form = event.currentTarget;
    const result = await createSubject(new FormData(form));
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    form.reset();
    setMessage("Subject created.");
  }

  return (
    <div className="flex flex-col gap-8">
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

      <div className="surface-raised overflow-x-auto">
        <table className="min-w-full text-left text-[15px]">
          <thead className="border-b border-[var(--gray-200)] bg-[var(--gray-50)] text-[13px] uppercase tracking-[0.02em] text-[var(--gray-500)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {subjects.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-[15px] text-[var(--gray-500)]">
                  No subjects yet. Add one below.
                </td>
              </tr>
            ) : (
              subjects.map((subject) => {
                const isEditing = editingId === subject.id;

                return (
                  <tr
                    key={subject.id}
                    className={`interactive-row border-b border-[var(--gray-100)] ${
                      isEditing ? "bg-[var(--brand-50)]/40" : ""
                    }`}
                  >
                    {isEditing ? (
                      <td colSpan={3} className="px-4 py-4">
                        <form
                          className="motion-enter flex flex-col gap-4"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            setError(null);
                            setSaving(true);
                            const result = await updateSubject(
                              new FormData(event.currentTarget),
                            );
                            setSaving(false);
                            if (!result.ok) {
                              setError(result.error.message);
                              return;
                            }
                            setMessage("Subject updated.");
                            setEditingId(null);
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[15px] font-semibold text-[var(--gray-900)]">
                              Edit {subject.name}
                            </p>
                            <button
                              type="button"
                              className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--gray-600)] hover:bg-[var(--gray-100)]"
                              aria-label="Cancel editing"
                              onClick={() => setEditingId(null)}
                            >
                              <X className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                          <input type="hidden" name="id" value={subject.id} />
                          <div className="flex flex-wrap items-end gap-3">
                            <Input
                              label="Name"
                              name="name"
                              defaultValue={subject.name}
                              required
                            />
                            <Input
                              label="Code"
                              name="code"
                              defaultValue={subject.code ?? ""}
                            />
                            <Button type="submit" loading={saving}>
                              Save
                            </Button>
                          </div>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-[var(--gray-900)]">
                          {subject.name}
                        </td>
                        <td className="px-4 py-3 text-[var(--gray-600)]">
                          {subject.code ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
                              aria-label={`Edit ${subject.name}`}
                              onClick={() => setEditingId(subject.id)}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--error-700)] hover:bg-[var(--error-50)]"
                              aria-label={`Delete ${subject.name}`}
                              onClick={() => setPendingDelete(subject)}
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Card className="max-w-lg">
        <form onSubmit={onCreate} className="flex flex-col gap-4">
          <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Add subject</h2>
          <Input label="Name" name="name" required />
          <Input label="Code" name="code" placeholder="ENG" />
          <Button type="submit" className="self-start">
            Add subject
          </Button>
        </form>
      </Card>

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title="Delete this subject?"
        consequence={
          pendingDelete
            ? `“${pendingDelete.name}” will be removed from the subject list. Class–subject links for this subject will also be removed. This cannot be undone from the UI.`
            : ""
        }
        confirmLabel="Delete subject"
        destructive
        loading={pending}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => {
          if (!pendingDelete) return;
          startTransition(async () => {
            const result = await deleteSubject(pendingDelete.id);
            setPendingDelete(null);
            if (!result.ok) setError(result.error.message);
            else {
              if (editingId === pendingDelete.id) setEditingId(null);
              setMessage("Subject deleted.");
            }
          });
        }}
      />
    </div>
  );
}
