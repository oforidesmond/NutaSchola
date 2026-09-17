import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/primitives";
import { Breadcrumb } from "@/components/ui/Card";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS, can } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { loadSchoolBrand } from "@/lib/reports/school";
import { StudentFeesPanel } from "./StudentFeesPanel";

export default async function StudentFeesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, tenant } = await requirePageAccess(ACTIONS.FEES_READ);
  const canManage = can(user.role, ACTIONS.FEES_MANAGE);

  const student = await prisma.student.findFirst({
    where: { id, schoolId: tenant.schoolId, deletedAt: null },
  });
  if (!student) notFound();

  const [classLevel, currentTerm, invoices, school] = await Promise.all([
    student.currentClassLevelId
      ? prisma.classLevel.findFirst({
          where: { id: student.currentClassLevelId, schoolId: tenant.schoolId },
          select: { name: true },
        })
      : Promise.resolve(null),
    prisma.term.findFirst({
      where: { schoolId: tenant.schoolId, isCurrent: true },
      select: { id: true, name: true },
    }),
    prisma.invoice.findMany({
      where: {
        schoolId: tenant.schoolId,
        studentId: student.id,
        feeStructure: { feeType: "SCHOOL_FEES" },
        status: { notIn: ["CANCELED", "VOID"] },
      },
      include: {
        term: { select: { id: true, name: true } },
        items: true,
        payments: {
          orderBy: { createdAt: "desc" },
          include: { receipt: { select: { receiptNumber: true } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    loadSchoolBrand(tenant.schoolId),
  ]);

  const fullName = `${student.firstName} ${student.lastName}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Students", href: "/dashboard" },
            { label: fullName },
            { label: "Fees" },
          ]}
        />
        <PageHeader
          title={`${fullName} — Fees`}
          description={`${student.admissionNumber}${
            classLevel ? ` · ${classLevel.name}` : ""
          }${currentTerm ? ` · ${currentTerm.name}` : ""}`}
        />
      </div>

      <StudentFeesPanel
        studentId={student.id}
        currentTermId={currentTerm?.id ?? null}
        canManage={canManage}
        school={school}
        payer={{
          fullName,
          classLevelName: classLevel?.name ?? "—",
        }}
        invoices={invoices.map((inv) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          termId: inv.termId,
          termName: inv.term?.name ?? null,
          totalAmount: inv.totalAmount.toString(),
          amountPaid: inv.amountPaid.toString(),
          status: inv.status,
          items: inv.items.map((item) => ({
            id: item.id,
            description: item.description,
            amount: item.amount.toString(),
          })),
          payments: inv.payments.map((p) => ({
            id: p.id,
            amount: p.amount.toString(),
            method: p.method,
            reference: p.reference,
            paidAt: p.paidAt ? p.paidAt.toISOString() : null,
            receiptNumber: p.receipt?.receiptNumber ?? null,
          })),
        }))}
      />
    </div>
  );
}
