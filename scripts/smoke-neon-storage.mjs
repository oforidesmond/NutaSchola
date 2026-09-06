/**
 * One-off smoke test for Neon Object Storage.
 * Loads .env then .env.local (local overrides).
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import {
  ListBucketsCommand,
  PutObjectCommand,
  GetObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

function loadEnvFile(file) {
  const path = resolve(process.cwd(), file);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key] || file === ".env.local") {
      process.env[key] = value;
    }
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const endpoint = process.env.AWS_ENDPOINT_URL_S3;
const region = process.env.AWS_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
const preferredBucket = "nuta-schola";

if (!endpoint || !region || !accessKeyId || !secretAccessKey) {
  console.error("Missing AWS_* env vars");
  process.exit(1);
}

const s3 = new S3Client({
  region,
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});

async function main() {
  console.log("endpoint:", endpoint);
  console.log("region:", region);

  let buckets = [];
  try {
    const listed = await s3.send(new ListBucketsCommand({}));
    buckets = (listed.Buckets ?? []).map((b) => b.Name).filter(Boolean);
    console.log("buckets:", buckets.length ? buckets.join(", ") : "(none)");
  } catch (error) {
    console.error(
      "ListBuckets failed:",
      error instanceof Error ? error.message : error,
    );
  }

  const bucket = buckets.includes(preferredBucket)
    ? preferredBucket
    : buckets[0] ?? preferredBucket;
  console.log("using bucket:", bucket);

  const key = `smoke/nuta-schola-${Date.now()}.txt`;
  const body = `NutaSchola Neon Object Storage smoke @ ${new Date().toISOString()}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: "text/plain",
    }),
  );
  console.log("upload: ok", key);

  const got = await s3.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
  const text = await got.Body?.transformToString();
  console.log("read: ok", text === body ? "(content matches)" : "(mismatch)");
  console.log("SMOKE_OK");
}

main().catch((error) => {
  console.error("SMOKE_FAILED", error instanceof Error ? error.message : error);
  process.exit(1);
});
