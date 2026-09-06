import { NextResponse } from "next/server";
import { isBlobConfigured, listRecentBlobs, uploadTestBlob } from "@/lib/blob";

/**
 * Minimal Object Storage proof endpoint.
 * GET  — status + optional list when AWS_* / Neon bucket env is configured
 * POST — upload a tiny smoke-test object
 */
export async function GET() {
  if (!isBlobConfigured()) {
    return NextResponse.json({
      ok: false,
      configured: false,
      error: {
        code: "BLOB_NOT_CONFIGURED",
        message:
          "Neon Object Storage env vars are not set. Run neon deploy + neon env pull on a us-east-2 project with the nuta-schola bucket.",
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
