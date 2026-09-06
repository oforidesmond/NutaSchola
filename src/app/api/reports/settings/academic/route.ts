import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { prisma } from "@/lib/db/prisma";
import { formatDateAccra } from "@/lib/format/currency";
import { csvDownloadResponse, rowsToCsv } from "@/lib/reports";
import { AppError } from "@/lib/errors";

export async function GET() {
  try {
    const { tenant } = await requireAction(ACTIONS.ACADEMIC_READ);

    const years = await prisma.academicYear.findMany({
      where: { schoolId: tenant.schoolId },
      include: { terms: { orderBy: { startDate: "asc" } } },
      orderBy: { startDate: "desc" },
    });

    const columns = [
      { key: "year", header: "Academic year" },
      { key: "yearCurrent", header: "Year is current" },
      { key: "yearRange", header: "Year dates" },
      { key: "term", header: "Term" },
      { key: "termCurrent", header: "Term is current" },
      { key: "termRange", header: "Term dates" },
    ] as const;

    const rows = years.flatMap((year) => {
      if (year.terms.length === 0) {
        return [
          {
            year: year.name,
            yearCurrent: year.isCurrent ? "Yes" : "No",
            yearRange: `${formatDateAccra(year.startDate)} – ${formatDateAccra(year.endDate)}`,
            term: "",
            termCurrent: "",
            termRange: "",
          },
        ];
      }
      return year.terms.map((term) => ({
        year: year.name,
        yearCurrent: year.isCurrent ? "Yes" : "No",
        yearRange: `${formatDateAccra(year.startDate)} – ${formatDateAccra(year.endDate)}`,
        term: term.name,
        termCurrent: term.isCurrent ? "Yes" : "No",
        termRange: `${formatDateAccra(term.startDate)} – ${formatDateAccra(term.endDate)}`,
      }));
    });

    return csvDownloadResponse(rowsToCsv([...columns], rows), "academic-years-terms.csv");
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
