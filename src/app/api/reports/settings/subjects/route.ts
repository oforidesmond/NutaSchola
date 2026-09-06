import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { csvDownloadResponse, rowsToCsv } from "@/lib/reports";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_READ);

    const subjects = await prisma.subject.findMany({
      where: { schoolId: tenant.schoolId },
      orderBy: { name: "asc" },
    });

    const columns = [
      { key: "name", header: "Subject" },
      { key: "code", header: "Code" },
    ] as const;

    const rows = subjects.map((s) => ({
      name: s.name,
      code: s.code ?? "",
    }));

    return csvDownloadResponse(rowsToCsv([...columns], rows), "subjects.csv");
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
