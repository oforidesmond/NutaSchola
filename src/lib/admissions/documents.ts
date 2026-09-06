import {
  DocumentEntityType,
  type DocumentType,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { assertDocumentEntity } from "@/lib/documents/validate";
import { isBlobConfigured, uploadBlob } from "@/lib/blob";

const ALLOWED_DOCUMENT_TYPES: DocumentType[] = [
  "BIRTH_CERTIFICATE",
  "PASSPORT_PHOTO",
  "PREVIOUS_REPORT_CARD",
];

/**
 * Persist an admissions document to Neon Object Storage + Document row.
 * Kept out of Server Actions so files-sdk (node:module) never enters the
 * Turbopack client-reference graph for the application detail page.
 */
export async function storeApplicationDocument(input: {
  schoolId: string;
  userId: string;
  applicationId: string;
  documentType: string;
  file: File;
}): Promise<ActionResult<{ id: string }>> {
  const { schoolId, userId, applicationId, documentType, file } = input;

  if (!ALLOWED_DOCUMENT_TYPES.includes(documentType as DocumentType)) {
    return fail("VALIDATION_ERROR", "Unsupported document type.");
  }
  if (!(file instanceof File) || file.size === 0) {
    return fail("VALIDATION_ERROR", "Please choose a file to upload.");
  }
  if (!isBlobConfigured()) {
    return fail(
      "BLOB_NOT_CONFIGURED",
      "File storage is not configured for this environment yet. Ask an administrator to set up Neon Object Storage.",
    );
  }

  const application = await prisma.admissionApplication.findFirst({
    where: { id: applicationId, schoolId, deletedAt: null },
  });
  if (!application) {
    throw new AppError("NOT_FOUND", "Application not found.", { status: 404 });
  }

  await prisma.$transaction((tx) =>
    assertDocumentEntity(tx, schoolId, DocumentEntityType.ADMISSION_APPLICATION, applicationId),
  );

  const buffer = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const key = `admissions/${applicationId}/${documentType.toLowerCase()}/${Date.now()}-${safeName}`;

  const uploaded = await uploadBlob(key, buffer, { contentType: file.type || undefined });
  if (!uploaded.ok) {
    return fail(uploaded.error.code, uploaded.error.message);
  }

  const document = await prisma.$transaction(async (tx) => {
    const created = await tx.document.create({
      data: {
        schoolId,
        entityType: DocumentEntityType.ADMISSION_APPLICATION,
        entityId: applicationId,
        type: documentType as DocumentType,
        fileName: file.name,
        blobUrl: uploaded.data.url,
        mimeType: file.type || null,
        sizeBytes: file.size,
        uploadedById: userId,
      },
    });

    if (documentType === "PASSPORT_PHOTO") {
      await tx.admissionApplication.update({
        where: { id: applicationId },
        data: { photoUrl: uploaded.data.url },
      });
    }

    return created;
  });

  return ok({ id: document.id });
}
