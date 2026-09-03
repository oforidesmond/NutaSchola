import { put, list } from "@vercel/blob";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { logger } from "@/lib/errors/logger";

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function uploadTestBlob(
  contents: string,
  filename = `blob-smoke-${Date.now()}.txt`,
): Promise<ActionResult<{ url: string; pathname: string }>> {
  if (!isBlobConfigured()) {
    return fail(
      "BLOB_NOT_CONFIGURED",
      "BLOB_READ_WRITE_TOKEN is not set. Add it to .env when a Vercel Blob store is ready.",
    );
  }

  try {
    const blob = await put(filename, contents, {
      access: "public",
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: true,
    });

    return ok({ url: blob.url, pathname: blob.pathname });
  } catch (error) {
    logger.error("blob.upload_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fail("BLOB_UPLOAD_FAILED", "Could not upload to Vercel Blob.");
  }
}

export async function listRecentBlobs(
  limit = 5,
): Promise<ActionResult<{ blobs: { url: string; pathname: string }[] }>> {
  if (!isBlobConfigured()) {
    return fail(
      "BLOB_NOT_CONFIGURED",
      "BLOB_READ_WRITE_TOKEN is not set. Add it to .env when a Vercel Blob store is ready.",
    );
  }

  try {
    const result = await list({
      limit,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    return ok({
      blobs: result.blobs.map((b) => ({ url: b.url, pathname: b.pathname })),
    });
  } catch (error) {
    logger.error("blob.list_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fail("BLOB_LIST_FAILED", "Could not list Vercel Blob objects.");
  }
}
