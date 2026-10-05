import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader, Button, StatusBadge } from "@/components/ui/primitives";
import { Breadcrumb, Card } from "@/components/ui/Card";
import { requirePageAccess } from "@/lib/auth/session";
import { ACTIONS, can } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { StudentProfileForm } from "./StudentProfileForm";

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { user, tenant } = await requirePageAccess(ACTIONS.FEES_READ);
  const canEdit = can(user.role, ACTIONS.ADMISSIONS_UPDATE);

  const studentAny = await prisma.student.findFirst({
    where: { id, schoolId: tenant.schoolId },
  });
  if (!studentAny) notFound();

  const [classLevels, sections, classLevel, section] = await Promise.all([
    prisma.classLevel.findMany({
      where: { schoolId: tenant.schoolId },
      orderBy: { order: "asc" },
      select: { id: true, name: true },
    }),
    prisma.section.findMany({
      where: { schoolId: tenant.schoolId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, classLevelId: true },
    }),
    studentAny.currentClassLevelId
      ? prisma.classLevel.findFirst({
          where: { id: studentAny.currentClassLevelId, schoolId: tenant.schoolId },
          select: { name: true },
        })
      : Promise.resolve(null),
    studentAny.currentSectionId
      ? prisma.section.findFirst({
          where: { id: studentAny.currentSectionId, schoolId: tenant.schoolId },
          select: { name: true },
        })
      : Promise.resolve(null),
  ]);

  const fullName = `${studentAny.firstName} ${studentAny.lastName}`;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Breadcrumb
          items={[
            { label: "Students", href: "/students" },
            { label: fullName },
          ]}
        />
        <PageHeader
          title={fullName}
          description={`${studentAny.admissionNumber}${
            classLevel ? ` · ${classLevel.name}` : ""
          }${section ? ` · Sec ${section.name}` : ""}`}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {!studentAny.isActive || studentAny.deletedAt ? (
                <StatusBadge label="Inactive" tone="warning" />
              ) : null}
              <Link href={`/students/${studentAny.id}/fees`}>
                <Button variant="secondary" type="button">
                  Fees
                </Button>
              </Link>
            </div>
          }
        />
      </div>

      <Card>
        <h2 className="text-[20px] font-semibold text-[var(--gray-900)]">Profile</h2>
        <p className="mt-1 text-[15px] text-[var(--gray-600)]">
          Update bio details and class placement for the current academic year.
        </p>
        <div className="mt-6">
          <StudentProfileForm
            canEdit={canEdit}
            classLevels={classLevels}
            sections={sections}
            student={{
              id: studentAny.id,
              firstName: studentAny.firstName,
              middleName: studentAny.middleName,
              lastName: studentAny.lastName,
              dateOfBirth: toDateInputValue(studentAny.dateOfBirth),
              gender: studentAny.gender,
              nationality: studentAny.nationality,
              homeAddress: studentAny.homeAddress,
              currentClassLevelId: studentAny.currentClassLevelId,
              currentSectionId: studentAny.currentSectionId,
              isActive: studentAny.isActive && !studentAny.deletedAt,
            }}
          />
        </div>
      </Card>
    </div>
  );
}
