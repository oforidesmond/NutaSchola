"use client";

import { FormEvent, useState } from "react";
import { SchoolLevel } from "@prisma/client";
import { Button, Input } from "@/components/ui/primitives";
import { createClassLevel, createSection, updateClassLevel } from "./actions";

type LevelRow = {
  id: string;
  name: string;
  levelType: SchoolLevel;
  order: number;
  capacity: number | null;
  sections: { id: string; name: string }[];
};

const LEVEL_OPTIONS = Object.values(SchoolLevel);

export function ClassesManager({ levels }: { levels: LevelRow[] }) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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

      <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] shadow-[var(--shadow-sm)]">
        <table className="min-w-full text-left text-[15px]">
          <thead className="border-b border-[var(--gray-200)] bg-[var(--gray-50)] text-[13px] uppercase tracking-[0.02em] text-[var(--gray-500)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Order</th>
              <th className="px-4 py-3 font-semibold">Name</th>
              <th className="px-4 py-3 font-semibold">Level type</th>
              <th className="px-4 py-3 font-semibold">Sections</th>
              <th className="px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {levels.map((level) => (
              <tr key={level.id} className="border-b border-[var(--gray-100)]">
                <td className="px-4 py-2 font-variant-numeric tabular-nums">{level.order}</td>
                <td className="px-4 py-2 font-medium text-[var(--gray-900)]">{level.name}</td>
                <td className="px-4 py-2 text-[var(--gray-600)]">{level.levelType}</td>
                <td className="px-4 py-2 text-[var(--gray-600)]">
                  {level.sections.map((s) => s.name).join(", ") || "—"}
                </td>
                <td className="px-4 py-2">
                  <form
                    className="flex min-h-11 flex-wrap items-end gap-2"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      setError(null);
                      const result = await updateClassLevel(new FormData(event.currentTarget));
                      if (!result.ok) setError(result.error.message);
                      else setMessage("Class level updated.");
                    }}
                  >
                    <input type="hidden" name="id" value={level.id} />
                    <input type="hidden" name="levelType" value={level.levelType} />
                    <Input
                      label="Name"
                      name="name"
                      defaultValue={level.name}
                      className="min-w-[8rem]"
                    />
                    <Input
                      label="Order"
                      name="order"
                      type="number"
                      defaultValue={level.order}
                      className="w-20"
                    />
                    <Input
                      label="Capacity"
                      name="capacity"
                      type="number"
                      defaultValue={level.capacity ?? ""}
                      className="w-24"
                    />
                    <Button type="submit" variant="secondary">
                      Save
                    </Button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid max-w-4xl gap-6 lg:grid-cols-2">
        <form
          onSubmit={onCreateLevel}
          className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]"
        >
          <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Add class level</h2>
          <Input label="Name" name="name" placeholder="Primary 7" required />
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Level type</span>
            <select
              name="levelType"
              required
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3 text-base"
              defaultValue={SchoolLevel.PRIMARY}
            >
              {LEVEL_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
          <Input label="Sort order" name="order" type="number" defaultValue={levels.length + 1} required />
          <Input label="Capacity (optional)" name="capacity" type="number" />
          <Button type="submit">Add class</Button>
        </form>

        <form
          onSubmit={onCreateSection}
          className="flex flex-col gap-4 rounded-[var(--radius-md)] border border-[var(--gray-200)] bg-[var(--white)] p-6 shadow-[var(--shadow-sm)]"
        >
          <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Add section</h2>
          <label className="flex flex-col gap-2">
            <span className="text-[15px] font-medium text-[var(--gray-800)]">Class level</span>
            <select
              name="classLevelId"
              required
              className="min-h-11 rounded-[var(--radius-sm)] border border-[var(--gray-200)] bg-white px-3 text-base"
            >
              <option value="">Select class</option>
              {levels.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </label>
          <Input label="Section name" name="name" placeholder="B" required />
          <Button type="submit">Add section</Button>
        </form>
      </div>
    </div>
  );
}
