import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { csvDownloadResponse, rowsToCsv } from "@/lib/reports";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_READ);

    const levels = await prisma.classLevel.findMany({
      where: { schoolId: tenant.schoolId },
      include: { sections: { orderBy: { name: "asc" } } },
      orderBy: { order: "asc" },
    });

    const columns = [
      { key: "className", header: "Class" },
      { key: "levelType", header: "Level type" },
      { key: "order", header: "Order" },
      { key: "capacity", header: "Capacity" },
      { key: "sections", header: "Sections" },
    ] as const;

    const rows = levels.map((l) => ({
      className: l.name,
      levelType: l.levelType,
      order: l.order,
      capacity: l.capacity ?? "",
      sections: l.sections.map((s) => s.name).join(", "),
    }));

    return csvDownloadResponse(rowsToCsv([...columns], rows), "classes-sections.csv");
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status ?? 400 },
      );
    }
    return Response.json(
      { error: { code: "INTERNAL", message: "Export failed." } },
      { status: 500 },
    );
  }
}
