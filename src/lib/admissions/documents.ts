import {
  DocumentEntityType,
  type DocumentType,
} from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { AppError, fail, ok, type ActionResult } from "@/lib/errors";
import { assertDocumentEntity } from "@/lib/documents/validate";
import { deleteBlob, isBlobConfigured, uploadBlob } from "@/lib/blob";
import { logger } from "@/lib/errors/logger";

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

/**
 * Delete a document row and its blob. Clears application photoUrl when the
 * deleted file is the current passport photo.
 */
export async function deleteApplicationDocument(input: {
  schoolId: string;
  applicationId: string;
  documentId: string;
}): Promise<ActionResult<{ deleted: true }>> {
  const { schoolId, applicationId, documentId } = input;

  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      schoolId,
      entityType: DocumentEntityType.ADMISSION_APPLICATION,
      entityId: applicationId,
    },
  });
  if (!document) {
    return fail("NOT_FOUND", "Document not found.");
  }

  const application = await prisma.admissionApplication.findFirst({
    where: { id: applicationId, schoolId, deletedAt: null },
    select: { id: true, photoUrl: true },
  });
  if (!application) {
    return fail("NOT_FOUND", "Application not found.");
  }

  // Best-effort blob delete — still remove DB row if storage is missing/fails
  // so staff can clean up orphaned metadata.
  if (isBlobConfigured()) {
    const blobResult = await deleteBlob(document.blobUrl);
    if (!blobResult.ok && blobResult.error.code !== "VALIDATION_ERROR") {
      logger.warn("document.blob_delete_failed", {
        documentId,
        code: blobResult.error.code,
        message: blobResult.error.message,
      });
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.document.delete({ where: { id: document.id } });
    if (
      document.type === "PASSPORT_PHOTO" &&
      application.photoUrl &&
      application.photoUrl === document.blobUrl
    ) {
      await tx.admissionApplication.update({
        where: { id: applicationId },
        data: { photoUrl: null },
      });
    }
  });

  return ok({ deleted: true });
}
