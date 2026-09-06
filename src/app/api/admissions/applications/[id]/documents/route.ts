import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { requireAction } from "@/lib/auth/session";
import { ACTIONS } from "@/lib/permissions";
import { AppError, toActionError } from "@/lib/errors";
import { storeApplicationDocument } from "@/lib/admissions/documents";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id: applicationId } = await context.params;
    const { tenant, user } = await requireAction(ACTIONS.ADMISSIONS_DOCUMENTS);

    const formData = await request.formData();
    const documentType = String(formData.get("documentType") ?? "");
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: { code: "VALIDATION_ERROR", message: "Please choose a file to upload." } },
        { status: 400 },
      );
    }

    const result = await storeApplicationDocument({
      schoolId: tenant.schoolId,
      userId: user.id,
      applicationId,
      documentType,
      file,
    });

    if (!result.ok) {
      const status =
        result.error.code === "BLOB_NOT_CONFIGURED"
          ? 503
          : result.error.code === "NOT_FOUND"
            ? 404
            : 400;
      return NextResponse.json(result, { status });
    }

    revalidatePath(`/admissions/applications/${applicationId}`);
    revalidatePath("/admissions/applications");
    revalidatePath("/admissions");

    return NextResponse.json(result);
  } catch (error) {
    const actionError = toActionError(error);
    const status = error instanceof AppError ? error.status : 500;
    return NextResponse.json({ ok: false, error: actionError }, { status });
  }
}
