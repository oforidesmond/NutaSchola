"use client";

import { FormEvent, useState, useTransition } from "react";
import { Button, Input } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { createSubject, deleteSubject, updateSubject } from "./actions";

type SubjectRow = { id: string; name: string; code: string | null };

export function SubjectsManager({ subjects }: { subjects: SubjectRow[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
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

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] shadow-[var(--shadow-sm)]">
        <table className="min-w-full text-left text-[15px]">
          <thead className="border-b border-[var(--gray-200)] bg-[var(--gray-50)] text-[13px] uppercase tracking-[0.02em] text-[var(--gray-500)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Code</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {subjects.map((subject) => (
              <tr key={subject.id} className="border-b border-[var(--gray-100)]">
                <td className="px-4 py-2 font-medium">{subject.name}</td>
                <td className="px-4 py-2 text-[var(--gray-600)]">{subject.code ?? "—"}</td>
                <td className="px-4 py-2">
                  <div className="flex min-h-11 flex-wrap items-center gap-2">
                    <form
                      className="flex flex-wrap items-end gap-2"
                      onSubmit={async (event) => {
                        event.preventDefault();
                        const result = await updateSubject(new FormData(event.currentTarget));
                        if (!result.ok) setError(result.error.message);
                        else setMessage("Subject updated.");
                      }}
                    >
                      <input type="hidden" name="id" value={subject.id} />
                      <Input label="Name" name="name" defaultValue={subject.name} />
                      <Input label="Code" name="code" defaultValue={subject.code ?? ""} />
                      <Button type="submit" variant="secondary">
                        Save
                      </Button>
                    </form>
                    <Button
                      type="button"
                      variant="ghost"
                      className="min-h-11 min-w-11 text-[var(--error-700)]"
                      onClick={() => setPendingDelete(subject)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form
        onSubmit={onCreate}
        className="flex max-w-lg flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]"
      >
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Add subject</h2>
        <Input label="Name" name="name" required />
        <Input label="Code" name="code" placeholder="ENG" />
        <Button type="submit">Add subject</Button>
      </form>

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
            else setMessage("Subject deleted.");
          });
        }}
      />
    </div>
  );
}
