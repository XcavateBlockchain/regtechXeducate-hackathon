import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  userId: z.string().min(8),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const { userId } = querySchema.parse({
      userId: searchParams.get("userId") ?? "",
    });

    const user = await prisma.user.findUnique({
      where: { userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const credentials = await prisma.credential.findMany({
      where: { recipientId: user.id },
      orderBy: { issuedAt: "desc" },
      select: {
        id: true,
        status: true,
        issuedAt: true,
        expiresAt: true,
        metadataUri: true,
        scoreBps: true,
        credentialType: true,
        moduleId: true,
        module: { select: { name: true } },
        issuingCompany: { select: { name: true } },
      },
    });

    const grouped = {
      ACTIVE: credentials.filter((c) => c.status === "ACTIVE"),
      REVOKED: credentials.filter((c) => c.status === "REVOKED"),
      EXPIRED: credentials.filter((c) => c.status === "EXPIRED"),
    } as const;

    return NextResponse.json({ credentials: grouped }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[GET /api/user/credentials]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
