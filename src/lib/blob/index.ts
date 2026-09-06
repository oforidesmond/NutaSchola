import { Files } from "files-sdk";
import { neon } from "files-sdk/neon";
import { fail, ok, type ActionResult } from "@/lib/errors";
import { logger } from "@/lib/errors/logger";

/** Neon Object Storage bucket declared in neon.ts */
export const BLOB_BUCKET = "nuta-schola";

/**
 * Neon Object Storage is configured when the branch-injected AWS S3 env vars
 * are present (see `neon env pull` / `neon deploy`).
 */
export function isBlobConfigured(): boolean {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_ENDPOINT_URL_S3 &&
      process.env.AWS_REGION,
  );
}

function getFiles() {
  return new Files({ adapter: neon({ bucket: BLOB_BUCKET }) });
}

export async function uploadBlob(
  key: string,
  body: Buffer | Uint8Array | Blob | string,
  options?: { contentType?: string },
): Promise<ActionResult<{ url: string; pathname: string }>> {
  if (!isBlobConfigured()) {
    return fail(
      "BLOB_NOT_CONFIGURED",
      "Neon Object Storage is not configured. Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_ENDPOINT_URL_S3, and AWS_REGION (via neon deploy / neon env pull on a us-east-2 project with the nuta-schola bucket).",
    );
  }

  try {
    const files = getFiles();
    await files.upload(key, body, {
      contentType: options?.contentType,
    });

    // public_read bucket — prefer a durable URL; fall back to presigned GET
    let url: string;
    try {
      url = await files.url(key, { expiresIn: 60 * 60 * 24 * 7 });
    } catch {
      const endpoint = process.env.AWS_ENDPOINT_URL_S3!.replace(/\/$/, "");
      url = `${endpoint}/${BLOB_BUCKET}/${key}`;
    }

    return ok({ url, pathname: key });
  } catch (error) {
    logger.error("blob.upload_failed", {
      error: error instanceof Error ? error.message : String(error),
      key,
    });
    return fail("BLOB_UPLOAD_FAILED", "Could not upload to Neon Object Storage.");
  }
}

export async function uploadTestBlob(
  contents: string,
  filename = `blob-smoke-${Date.now()}.txt`,
): Promise<ActionResult<{ url: string; pathname: string }>> {
  return uploadBlob(`smoke/${filename}`, contents, {
    contentType: "text/plain",
  });
}

export async function listRecentBlobs(
  limit = 5,
): Promise<ActionResult<{ blobs: { url: string; pathname: string }[] }>> {
  if (!isBlobConfigured()) {
    return fail(
      "BLOB_NOT_CONFIGURED",
      "Neon Object Storage is not configured. Set AWS_* vars via neon deploy / neon env pull.",
    );
  }

  try {
    const files = getFiles();
    const listed = await files.list({ prefix: "" });
    const items = listed.items.slice(0, limit).map((item) => ({
      pathname: item.key,
      url: item.key,
    }));

    return ok({ blobs: items });
  } catch (error) {
    logger.error("blob.list_failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return fail("BLOB_LIST_FAILED", "Could not list Neon Object Storage objects.");
  }
}
