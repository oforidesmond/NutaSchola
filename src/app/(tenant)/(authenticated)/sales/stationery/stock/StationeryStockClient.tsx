"use client";

import { FormEvent, useState } from "react";
import { Button, Input } from "@/components/ui/primitives";
import {
  createStationeryItemAction,
  updateStationeryItemAction,
} from "../actions";

export type ItemRow = {
  id: string;
  name: string;
  unitPrice: string;
  stockQuantity: number;
  isActive: boolean;
};

export function StationeryStockClient({ items }: { items: ItemRow[] }) {
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const result = await createStationeryItemAction(new FormData(e.currentTarget));
    setLoading(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setMessage("Item created.");
    e.currentTarget.reset();
  }

  return (
    <section className="surface-raised p-6">
      <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Catalog</h2>
      <p className="mt-1 text-[15px] text-[var(--gray-600)]">
        Record stationery items, prices, and stock quantities.
      </p>
      {message ? (
        <p className="mt-3 text-[15px] text-[var(--success-700)]">{message}</p>
      ) : null}
      {error ? <p className="mt-3 text-[15px] text-[var(--error-700)]">{error}</p> : null}

      <form onSubmit={onCreate} className="mt-4 grid gap-3 sm:grid-cols-4">
        <Input label="Name" name="name" required />
        <Input label="Unit price (GHS)" name="unitPrice" required defaultValue="5.00" />
        <Input label="Stock qty" name="stockQuantity" type="number" min={0} required defaultValue={0} />
        <Button type="submit" loading={loading} className="self-end">
          Add item
        </Button>
      </form>

      <ul className="mt-6 divide-y divide-[var(--gray-100)]">
        {items.map((item) => (
          <ItemEditRow key={item.id} item={item} />
        ))}
      </ul>
    </section>
  );
}

function ItemEditRow({ item }: { item: ItemRow }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(item.isActive);

  async function onSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("isActive", active ? "true" : "false");
    const result = await updateStationeryItemAction(formData);
    setLoading(false);
    if (!result.ok) setError(result.error.message);
  }

  return (
    <li className="py-3">
      <form onSubmit={onSave} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="id" value={item.id} />
        <Input label="Name" name="name" defaultValue={item.name} required />
        <Input label="Price" name="unitPrice" defaultValue={item.unitPrice} required />
        <Input
          label="Stock"
          name="stockQuantity"
          type="number"
          min={0}
          defaultValue={item.stockQuantity}
          required
        />
        <label className="flex items-center gap-2 text-[14px]">
          <input
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
          />
          Active
        </label>
        <Button type="submit" variant="secondary" loading={loading}>
          Save
        </Button>
        {error ? <span className="text-[13px] text-[var(--error-700)]">{error}</span> : null}
      </form>
    </li>
  );
}
