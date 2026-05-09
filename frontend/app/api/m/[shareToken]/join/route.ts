import { isAddress } from "@solana/kit";
import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPhantomAuthPayload } from "@/lib/phantom-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
  name: z.string().min(1),
  email: z.email(),
  timestampIso: z.string().min(1),
  message: z.string().min(1),
  signature: z.string().min(1),
});

function newExternalUserId() {
  return `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  try {
    const { shareToken } = await params;
    if (!shareToken || shareToken.length < 8) {
      return NextResponse.json(
        { error: "shareToken required" },
        { status: 400 },
      );
    }

    const json = await req.json();
    const { walletAddress, name, email, timestampIso, message, signature } =
      bodySchema.parse(json);
    if (!isAddress(walletAddress)) {
      return NextResponse.json(
        {
          error:
            "Invalid walletAddress. Expected a Solana base58 public key (32–44 chars).",
        },
        { status: 400 },
      );
    }

    verifyPhantomAuthPayload({
      purpose: "module-join",
      resourceId: shareToken,
      walletAddress,
      timestampIso,
      payload: { message, signature },
    });

    const module = await prisma.module.findFirst({
      where: { shareToken, status: "ACTIVE" },
      select: { id: true },
    });
    if (!module) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const existingByWallet = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true, userId: true, role: true, email: true },
    });
    const existingByEmail = await prisma.user.findUnique({
      where: { email },
      select: { id: true, userId: true, role: true, walletAddress: true },
    });

    // Don't merge two different accounts.
    if (
      existingByWallet &&
      existingByEmail &&
      existingByWallet.id !== existingByEmail.id
    ) {
      return NextResponse.json(
        { error: "Email and wallet belong to different accounts" },
        { status: 409 },
      );
    }

    const existing = existingByWallet ?? existingByEmail ?? null;
    if (existing && existing.role !== "USER") {
      return NextResponse.json(
        { error: "This email or wallet is already used by a non-user account" },
        { status: 409 },
      );
    }

    const user =
      existing && existingByWallet
        ? await prisma.user.update({
            where: { id: existing.id },
            data: {
              name,
              email,
            },
            select: { id: true, userId: true },
          })
        : existing
          ? await prisma.user.update({
              where: { id: existing.id },
              data: {
                name,
                walletAddress,
              },
              select: { id: true, userId: true },
            })
          : await prisma.user.create({
              data: {
                userId: newExternalUserId(),
                walletAddress,
                name,
                email,
                role: "USER",
              },
              select: { id: true, userId: true },
            });

    const existingEnrollment = await prisma.moduleEnrollment.findUnique({
      where: { moduleId_userId: { moduleId: module.id, userId: user.id } },
      select: { status: true },
    });

    if (!existingEnrollment) {
      await prisma.moduleEnrollment.create({
        data: {
          moduleId: module.id,
          userId: user.id,
          status: "PENDING",
        },
      });
    }

    return NextResponse.json(
      {
        moduleId: module.id,
        userId: user.userId,
        alreadyEnrolled: !!existingEnrollment,
      },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/m/:shareToken/join]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
