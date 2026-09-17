import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { buildImportTemplateBuffer } from "@/lib/admissions/import";

export async function GET() {
  await requireAction(ACTIONS.ADMISSIONS_CREATE);
  const buffer = await buildImportTemplateBuffer();
  return new Response(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="existing-students-import.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
