import type { InvoiceStatus, Prisma, PrismaClient } from "@prisma/client";
import { AppError } from "@/lib/errors";

type Db = Prisma.TransactionClient | PrismaClient;

function toAmount(value: { toString(): string } | string | number): number {
  const n = typeof value === "number" ? value : Number(value.toString());
  return Number.isFinite(n) ? n : 0;
}

/** Derive invoice status from billed total vs amount already paid. */
export function recomputeInvoiceStatus(
  total: number,
  paid: number,
): InvoiceStatus {
  const t = Number(total.toFixed(2));
  const p = Number(paid.toFixed(2));
  if (p <= 0) return "ISSUED";
  if (p >= t) return "PAID";
  return "PARTIALLY_PAID";
}

/**
 * Update invoice line amounts, recompute totalAmount and status.
 * New total must be > 0 and >= amountPaid.
 */
export async function updateInvoiceItemAmounts(
  db: Db,
  input: {
    schoolId: string;
    invoiceId: string;
    items: { id: string; amount: number; description?: string }[];
  },
): Promise<{ totalAmount: number; status: InvoiceStatus }> {
  const invoice = await db.invoice.findFirst({
    where: {
      id: input.invoiceId,
      schoolId: input.schoolId,
      status: { notIn: ["CANCELED", "VOID"] },
    },
    include: { items: true },
  });
  if (!invoice) {
    throw new AppError("NOT_FOUND", "Invoice not found.", { status: 404 });
  }

  const itemIds = new Set(invoice.items.map((i) => i.id));
  for (const item of input.items) {
    if (!itemIds.has(item.id)) {
      throw new AppError("VALIDATION_ERROR", "Invoice item does not belong to this invoice.", {
        status: 400,
      });
    }
    if (!(item.amount > 0)) {
      throw new AppError("VALIDATION_ERROR", "Each line amount must be greater than zero.", {
        status: 400,
      });
    }
  }

  const amountById = new Map(input.items.map((i) => [i.id, i]));
  let total = 0;
  for (const existing of invoice.items) {
    const update = amountById.get(existing.id);
    total += update ? Number(update.amount.toFixed(2)) : toAmount(existing.amount);
  }
  total = Number(total.toFixed(2));

  const paid = toAmount(invoice.amountPaid);
  if (total <= 0) {
    throw new AppError("VALIDATION_ERROR", "Billed amount must be greater than zero.", {
      status: 400,
    });
  }
  if (total < paid) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Billed amount cannot be less than the amount already paid (GHS ${paid.toFixed(2)}).`,
      { status: 400 },
    );
  }

  for (const item of input.items) {
    await db.invoiceItem.update({
      where: { id: item.id },
      data: {
        amount: item.amount.toFixed(2),
        ...(item.description !== undefined ? { description: item.description } : {}),
      },
    });
  }

  const status = recomputeInvoiceStatus(total, paid);
  await db.invoice.update({
    where: { id: invoice.id },
    data: {
      totalAmount: total.toFixed(2),
      status,
    },
  });

  return { totalAmount: total, status };
}

/**
 * Set a student's school-fees invoice billed total.
 * Single-item invoices: set that item's amount.
 * Multi-item: adjust the first item so total matches; reject if first would be <= 0.
 */
export async function updateStudentInvoiceBilledTotal(
  db: Db,
  input: {
    schoolId: string;
    invoiceId: string;
    totalAmount: number;
  },
): Promise<{ totalAmount: number; status: InvoiceStatus }> {
  const invoice = await db.invoice.findFirst({
    where: {
      id: input.invoiceId,
      schoolId: input.schoolId,
      status: { notIn: ["CANCELED", "VOID"] },
    },
    include: {
      items: { orderBy: { id: "asc" } },
      feeStructure: { select: { feeType: true } },
    },
  });
  if (!invoice || invoice.feeStructure?.feeType !== "SCHOOL_FEES") {
    throw new AppError("NOT_FOUND", "School fees invoice not found.", { status: 404 });
  }
  if (invoice.items.length === 0) {
    throw new AppError("VALIDATION_ERROR", "Invoice has no line items to update.", {
      status: 400,
    });
  }

  const newTotal = Number(input.totalAmount.toFixed(2));
  if (!(newTotal > 0)) {
    throw new AppError("VALIDATION_ERROR", "Billed amount must be greater than zero.", {
      status: 400,
    });
  }

  const paid = toAmount(invoice.amountPaid);
  if (newTotal < paid) {
    throw new AppError(
      "VALIDATION_ERROR",
      `Billed amount cannot be less than the amount already paid (GHS ${paid.toFixed(2)}).`,
      { status: 400 },
    );
  }

  if (invoice.items.length === 1) {
    return updateInvoiceItemAmounts(db, {
      schoolId: input.schoolId,
      invoiceId: invoice.id,
      items: [{ id: invoice.items[0].id, amount: newTotal }],
    });
  }

  const othersSum = invoice.items
    .slice(1)
    .reduce((sum, item) => sum + toAmount(item.amount), 0);
  const firstAmount = Number((newTotal - othersSum).toFixed(2));
  if (!(firstAmount > 0)) {
    throw new AppError(
      "VALIDATION_ERROR",
      "Cannot set this total while keeping other fee lines; reduce other items first.",
      { status: 400 },
    );
  }

  return updateInvoiceItemAmounts(db, {
    schoolId: input.schoolId,
    invoiceId: invoice.id,
    items: [{ id: invoice.items[0].id, amount: firstAmount }],
  });
}

export type SyncInvoicesResult = {
  updated: number;
  skipped: number;
};

/**
 * Push fee-structure item name/amount onto existing active invoices linked to that structure.
 * Skips invoices where amountPaid would exceed the new total (including fully paid when lowering).
 */
export async function syncInvoicesFromFeeStructure(
  db: Db,
  input: {
    schoolId: string;
    feeStructureId: string;
    feeItems: { feeItemId: string; name: string; amount: number }[];
  },
): Promise<SyncInvoicesResult> {
  const invoices = await db.invoice.findMany({
    where: {
      schoolId: input.schoolId,
      feeStructureId: input.feeStructureId,
      status: { notIn: ["CANCELED", "VOID"] },
    },
    include: { items: true },
  });

  let updated = 0;
  let skipped = 0;
  const feeById = new Map(input.feeItems.map((f) => [f.feeItemId, f]));

  for (const invoice of invoices) {
    const paid = toAmount(invoice.amountPaid);
    const updates: { id: string; amount: number; description: string }[] = [];

    for (const item of invoice.items) {
      if (!item.feeItemId) continue;
      const fee = feeById.get(item.feeItemId);
      if (!fee) continue;
      updates.push({
        id: item.id,
        amount: Number(fee.amount.toFixed(2)),
        description: fee.name,
      });
    }

    if (updates.length === 0) {
      continue;
    }

    const currentTotal = toAmount(invoice.totalAmount);
    const isFullyPaid = paid > 0 && paid >= currentTotal;
    if (isFullyPaid) {
      skipped += 1;
      continue;
    }

    const amountById = new Map(updates.map((u) => [u.id, u]));
    let newTotal = 0;
    for (const existing of invoice.items) {
      const upd = amountById.get(existing.id);
      newTotal += upd ? upd.amount : toAmount(existing.amount);
    }
    newTotal = Number(newTotal.toFixed(2));

    if (paid > newTotal) {
      skipped += 1;
      continue;
    }

    const unchanged =
      newTotal === currentTotal &&
      updates.every((u) => {
        const existing = invoice.items.find((i) => i.id === u.id);
        return (
          existing &&
          toAmount(existing.amount) === u.amount &&
          existing.description === u.description
        );
      });
    if (unchanged) {
      continue;
    }

    await updateInvoiceItemAmounts(db, {
      schoolId: input.schoolId,
      invoiceId: invoice.id,
      items: updates,
    });
    updated += 1;
  }

  return { updated, skipped };
}
