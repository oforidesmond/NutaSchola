"use client";

import { FormEvent, useState } from "react";
import { SchoolLevel } from "@prisma/client";
import { Pencil, X } from "lucide-react";
import { Button, Input } from "@/components/ui/primitives";
import { Card, Select } from "@/components/ui/Card";
import { createClassLevel, createSection, updateClassLevel } from "./actions";

type LevelRow = {
  id: string;
  name: string;
  levelType: SchoolLevel;
  order: number;
  capacity: number | null;
  sections: { id: string; name: string }[];
};

const LEVEL_OPTIONS = Object.values(SchoolLevel).map((opt) => ({
  value: opt,
  label: opt,
}));

export function ClassesManager({
  levels,
  readOnly = false,
}: {
  levels: LevelRow[];
  readOnly?: boolean;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function onCreateLevel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const form = event.currentTarget;
    const result = await createClassLevel(new FormData(form));
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    form.reset();
    setMessage("Class level created.");
  }

  async function onCreateSection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    const form = event.currentTarget;
    const result = await createSection(new FormData(form));
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    form.reset();
    setMessage("Section created.");
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
              <th className="px-4 py-3 font-semibold">Level type</th>
              <th className="px-4 py-3 font-semibold">Sections</th>
              <th className="px-4 py-3 font-semibold">Capacity</th>
              <th className="px-4 py-3 font-semibold">Order</th>
              {!readOnly ? (
                <th className="px-4 py-3 font-semibold">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {levels.length === 0 ? (
              <tr>
                <td
                  colSpan={readOnly ? 5 : 6}
                  className="px-4 py-8 text-center text-[15px] text-[var(--gray-500)]"
                >
                  No class levels yet.
                  {readOnly ? null : " Add one below."}
                </td>
              </tr>
            ) : (
              levels.map((level) => {
                const isEditing = !readOnly && editingId === level.id;
                const sectionsSummary =
                  level.sections.map((s) => s.name).join(", ") || "—";

                return (
                  <tr
                    key={level.id}
                    className={`interactive-row border-b border-[var(--gray-100)] ${
                      isEditing ? "bg-[var(--brand-50)]/40" : ""
                    }`}
                  >
                    {isEditing ? (
                      <td colSpan={6} className="px-4 py-4">
                        <form
                          className="motion-enter flex flex-col gap-4"
                          onSubmit={async (event) => {
                            event.preventDefault();
                            setError(null);
                            setSaving(true);
                            const result = await updateClassLevel(
                              new FormData(event.currentTarget),
                            );
                            setSaving(false);
                            if (!result.ok) {
                              setError(result.error.message);
                              return;
                            }
                            setMessage("Class level updated.");
                            setEditingId(null);
                          }}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[15px] font-semibold text-[var(--gray-900)]">
                              Edit {level.name}
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
                          <input type="hidden" name="id" value={level.id} />
                          <input type="hidden" name="levelType" value={level.levelType} />
                          <div className="flex flex-wrap items-end gap-3">
                            <Input
                              label="Name"
                              name="name"
                              defaultValue={level.name}
                              className="min-w-[10rem]"
                              required
                            />
                            <Input
                              label="Order"
                              name="order"
                              type="number"
                              defaultValue={level.order}
                              className="w-24"
                              required
                            />
                            <Input
                              label="Capacity"
                              name="capacity"
                              type="number"
                              defaultValue={level.capacity ?? ""}
                              className="w-28"
                            />
                            <Button type="submit" loading={saving}>
                              Save
                            </Button>
                          </div>
                          <p className="text-[13px] text-[var(--gray-500)]">
                            Level type: {level.levelType} · Sections: {sectionsSummary}
                          </p>
                        </form>
                      </td>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium text-[var(--gray-900)]">
                          {level.name}
                        </td>
                        <td className="px-4 py-3 text-[var(--gray-600)]">{level.levelType}</td>
                        <td className="px-4 py-3 text-[var(--gray-600)]">{sectionsSummary}</td>
                        <td className="px-4 py-3 font-variant-numeric tabular-nums text-[var(--gray-600)]">
                          {level.capacity ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-variant-numeric tabular-nums text-[var(--gray-600)]">
                          {level.order}
                        </td>
                        {!readOnly ? (
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              className="focus-ring inline-flex min-h-11 min-w-11 items-center justify-center rounded-[var(--radius-sm)] text-[var(--brand-700)] hover:bg-[var(--brand-50)]"
                              aria-label={`Edit ${level.name}`}
                              onClick={() => setEditingId(level.id)}
                            >
                              <Pencil className="h-4 w-4" aria-hidden />
                            </button>
                          </td>
                        ) : null}
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {!readOnly ? (
        <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
          <Card>
            <form onSubmit={onCreateLevel} className="flex flex-col gap-4">
              <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Add class level</h2>
              <Input label="Name" name="name" placeholder="Primary 7" required />
              <Select
                label="Level type"
                name="levelType"
                required
                defaultValue={SchoolLevel.PRIMARY}
                options={LEVEL_OPTIONS}
              />
              <Input
                label="Sort order"
                name="order"
                type="number"
                defaultValue={levels.length + 1}
                required
              />
              <Input label="Capacity (optional)" name="capacity" type="number" />
              <Button type="submit" className="self-start">
                Add class
              </Button>
            </form>
          </Card>

          <Card>
            <form onSubmit={onCreateSection} className="flex flex-col gap-4">
              <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Add section</h2>
              <Select
                label="Class level"
                name="classLevelId"
                required
                defaultValue=""
                options={[
                  { value: "", label: "Select class" },
                  ...levels.map((l) => ({ value: l.id, label: l.name })),
                ]}
              />
              <Input label="Section name" name="name" placeholder="B" required />
              <Button type="submit" className="self-start">
                Add section
              </Button>
            </form>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
