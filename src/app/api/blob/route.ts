import { NextResponse } from "next/server";
import { isBlobConfigured, listRecentBlobs, uploadTestBlob } from "@/lib/blob";

/**
 * Minimal Blob proof endpoint for Phase 0.
 * GET  — status + optional list when configured
 * POST — upload a tiny smoke-test object when BLOB_READ_WRITE_TOKEN is set
 */
export async function GET() {
  if (!isBlobConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: {
        code: "BLOB_NOT_CONFIGURED",
        message:
          "BLOB_READ_WRITE_TOKEN is not set. Scaffold is ready for production credentials.",
      },
    });
  }

  const listed = await listRecentBlobs(5);
  return NextResponse.json({ configured: true, ...listed });
}

export async function POST() {
  const result = await uploadTestBlob(
    `NutaSchola blob smoke test @ ${new Date().toISOString()}`,
  );

  if (!result.ok) {
    return NextResponse.json(
      { configured: isBlobConfigured(), ...result },
      { status: result.error.code === "BLOB_NOT_CONFIGURED" ? 503 : 500 },
    );
  }

  return NextResponse.json({ configured: true, ...result });
}
