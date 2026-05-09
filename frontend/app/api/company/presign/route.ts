import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appEnv } from "@/constants/app-env";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";

const querySchema = z.object({
  walletAddress: z.string().min(32),
  fileUrl: z.string().url(),
  expiresInSeconds: z.coerce.number().int().min(60).max(3600).optional(),
});

function parseS3UrlToKey(fileUrl: string): { bucket: string; key: string } {
  const url = new URL(fileUrl);

  // Handles:
  // - https://<bucket>.s3.<region>.amazonaws.com/<key>
  // - https://s3.<region>.amazonaws.com/<bucket>/<key>
  const host = url.hostname;
  const path = url.pathname.replace(/^\/+/, "");

  const virtualHosted =
    host.endsWith(".amazonaws.com") && host.includes(".s3.");
  if (virtualHosted) {
    const bucket = host.split(".s3.")[0] ?? "";
    return { bucket, key: decodeURIComponent(path) };
  }

  const pathParts = path.split("/");
  const bucket = pathParts.shift() ?? "";
  const key = decodeURIComponent(pathParts.join("/"));
  return { bucket, key };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { walletAddress, fileUrl, expiresInSeconds } = querySchema.parse({
      walletAddress: searchParams.get("walletAddress"),
      fileUrl: searchParams.get("fileUrl"),
      expiresInSeconds: searchParams.get("expiresInSeconds"),
    });

    const company = await prisma.company.findFirst({
      where: { owner: { walletAddress } },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const referenced = await prisma.module.findFirst({
      where: {
        companyId: company.id,
        OR: [{ thumbnailUrl: fileUrl }, { files: { some: { fileUrl } } }],
      },
      select: { id: true },
    });

    if (!referenced) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const { bucket, key } = parseS3UrlToKey(fileUrl);
    if (!bucket || !key) {
      return NextResponse.json({ error: "Invalid S3 URL" }, { status: 400 });
    }

    // Optional safety: ensure user isn't presigning outside our bucket.
    if (bucket !== appEnv.AWS_S3_BUCKET_NAME) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
      { expiresIn: expiresInSeconds ?? 900 },
    );

    return NextResponse.json(
      { url, expiresInSeconds: expiresInSeconds ?? 900 },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[GET /api/company/presign]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
