import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // files-sdk / AWS SDK use node:module; keep them server-external so Turbopack
  // never tries to chunk them into app-client bundles via server actions.
  serverExternalPackages: [
    "files-sdk",
    "@aws-sdk/client-s3",
    "@aws-sdk/s3-presigned-post",
    "@aws-sdk/s3-request-presigner",
  ],
};

export default nextConfig;
