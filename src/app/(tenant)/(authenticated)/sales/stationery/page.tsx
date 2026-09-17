import { PageHeader } from "@/components/ui/primitives";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { loadSchoolBrand } from "@/lib/reports/school";
import { StationeryClient } from "./StationeryClient";

export default async function StationerySalesPage() {
  const { tenant } = await requirePageAccess(ACTIONS.SALES_RECORD);

  const [items, sales, students, school] = await Promise.all([
    prisma.stationeryItem.findMany({
      where: { schoolId: tenant.schoolId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.stationerySale.findMany({
      where: { schoolId: tenant.schoolId },
      include: {
        receipt: { select: { receiptNumber: true } },
        student: { select: { firstName: true, lastName: true, admissionNumber: true } },
        lines: {
          select: { name: true, quantity: true, unitPrice: true, lineTotal: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.student.findMany({
      where: { schoolId: tenant.schoolId, deletedAt: null, isActive: true },
      select: { id: true, firstName: true, lastName: true, admissionNumber: true },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 500,
    }),
    loadSchoolBrand(tenant.schoolId),
  ]);

  return (
    <div>
      <PageHeader
        title="Stationery sales"
        description="Record stationery purchases and print receipts"
      />
      <StationeryClient
        school={school}
        items={items.map((i) => ({
          id: i.id,
          name: i.name,
          unitPrice: i.unitPrice.toFixed(2),
          stockQuantity: i.stockQuantity,
          isActive: i.isActive,
        }))}
        sales={sales.map((s) => ({
          id: s.id,
          createdAt: s.createdAt.toISOString(),
          totalAmount: s.totalAmount.toFixed(2),
          amountPaid: s.amountPaid.toFixed(2),
          receiptNumber: s.receipt?.receiptNumber ?? null,
          studentLabel: s.student
            ? `${s.student.firstName} ${s.student.lastName} (${s.student.admissionNumber})`
            : "Walk-in",
          method: s.method,
          lines: s.lines.map((l) => ({
            name: l.name,
            quantity: l.quantity,
            unitPrice: l.unitPrice.toFixed(2),
            lineTotal: l.lineTotal.toFixed(2),
          })),
        }))}
        students={students.map((s) => ({
          id: s.id,
          label: `${s.firstName} ${s.lastName} · ${s.admissionNumber}`,
        }))}
      />
    </div>
  );
}
