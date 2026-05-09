import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  images: {
    remotePatterns: [
      // Allow S3-hosted module thumbnails/content.
      {
        protocol: "https",
        hostname: "aws-regtech-educate.s3.eu-west-1.amazonaws.com",
      },
    ],
  },
};

export default nextConfig;
