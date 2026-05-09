import { PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import { z } from "zod";
import { appEnv } from "@/constants/app-env";
import { prisma } from "@/lib/prisma";
import { s3 } from "@/lib/s3";

const dataSchema = z.object({
  mode: z.enum(["manual", "ai"]).optional(),
  title: z.string().min(3).max(80).optional(),
  description: z.string().min(3).max(500).optional(),
  category: z.enum(["securities", "aml", "kyc", "defi", "tax"]).optional(),
  completionTime: z.enum(["15", "30", "45", "60", "90"]).optional(),
  language: z.enum(["en", "es", "fr", "de", "zh"]).optional(),
  passingScore: z.coerce.number().int().min(1).max(100).optional(),
  recipients: z.coerce.number().int().min(1).max(10000).optional(),
  moduleType: z
    .enum(["fca_investment", "fca_regulated", "sec_framework"])
    .optional(),
  quizTimeLimitMinutes: z.coerce.number().int().min(0).max(180).optional(),
  cooldownHours: z.coerce
    .number()
    .int()
    .min(0)
    .max(24 * 365)
    .optional(),
  credentialExpiryMonths: z.coerce.number().int().min(0).max(120).optional(),
});

async function uploadToS3(key: string, file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  await s3.send(
    new PutObjectCommand({
      Bucket: appEnv.AWS_S3_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: file.type,
      CacheControl: "public, max-age=31536000, immutable",
    }),
  );
  return `https://${appEnv.AWS_S3_BUCKET_NAME}.s3.${appEnv.XCAV_AWS_REGION}.amazonaws.com/${key}`;
}

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ slug: string; moduleId: string }> },
) {
  try {
    const { slug, moduleId } = await ctx.params;
    const fd = await req.formData();
    const walletAddress = fd.get("walletAddress") as string | null;
    const companyId = fd.get("companyId") as string | null;
    const thumbnail = fd.get("thumbnail") as File | null;
    const contents = fd.getAll("contents") as File[];
    const rawData = fd.get("data") as string | null;

    if (!walletAddress || !companyId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const company = await prisma.company.findUnique({
      where: { slug },
      select: { id: true, owner: { select: { walletAddress: true } } },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.id !== companyId) {
      return NextResponse.json({ error: "Company mismatch" }, { status: 400 });
    }
    if (company.owner.walletAddress !== walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const data = rawData ? dataSchema.parse(JSON.parse(rawData)) : {};

    const module = await prisma.module.findFirst({
      where: { id: moduleId, companyId },
      include: { company: { include: { owner: true } } },
    });
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }
    if (module.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only DRAFT modules can be edited" },
        { status: 400 },
      );
    }

    const updateData: Record<string, unknown> = {};
    if (data.title !== undefined) updateData.name = data.title;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.category !== undefined) {
      updateData.category = data.category;
      updateData.credentialType = data.category.toUpperCase();
    }
    if (data.completionTime !== undefined)
      updateData.completionTime = data.completionTime;
    if (data.language !== undefined) updateData.language = data.language;
    if (data.passingScore !== undefined)
      updateData.passThreshold = data.passingScore * 100;
    if (data.recipients !== undefined)
      updateData.maxRecipients = data.recipients;
    if (data.moduleType !== undefined)
      updateData.moduleType =
        data.moduleType === "fca_investment"
          ? "FCA_INVESTMENT"
          : data.moduleType === "fca_regulated"
            ? "FCA_REGULATED"
            : "SEC_FRAMEWORK";
    if (data.cooldownHours !== undefined)
      updateData.coolDownSeconds = data.cooldownHours * 3600;
    if (data.credentialExpiryMonths !== undefined)
      updateData.expiresInSeconds =
        data.credentialExpiryMonths > 0
          ? data.credentialExpiryMonths * 30 * 86400
          : null;

    if (thumbnail && thumbnail.size > 0) {
      const ext = thumbnail.name.split(".").pop() ?? "jpg";
      const key = `modules/${module.moduleIdHash}/thumbnail.${ext}`;
      updateData.thumbnailUrl = await uploadToS3(key, thumbnail);
    }

    if (contents.length > 0) {
      await prisma.moduleFile.deleteMany({ where: { moduleId } });
      const fileRows = [];
      for (let i = 0; i < contents.length; i++) {
        const f = contents[i];
        const fext = f.name.split(".").pop() ?? "bin";
        const url = await uploadToS3(
          `modules/${module.moduleIdHash}/content-${i}.${fext}`,
          f,
        );
        fileRows.push({
          moduleId,
          fileName: f.name,
          fileUrl: url,
          fileSize: f.size,
          mimeType: f.type,
          sortOrder: i,
        });
      }
      await prisma.moduleFile.createMany({ data: fileRows });
    }

    await prisma.module.update({ where: { id: moduleId }, data: updateData });

    if (data.quizTimeLimitMinutes !== undefined) {
      const timeLimit =
        data.quizTimeLimitMinutes > 0 ? data.quizTimeLimitMinutes * 60 : null;
      await prisma.assessment.update({
        where: { moduleId },
        data: { timeLimit },
      });
    }

    return NextResponse.json({ moduleId }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[PATCH /api/company/[slug]/modules/:moduleId]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
