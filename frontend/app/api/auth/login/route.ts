import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyPhantomAuthPayload } from "@/lib/phantom-auth";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  walletAddress: z.string().min(32),
  timestampIso: z.string().min(1),
  message: z.string().min(1),
  signature: z.string().min(1),
});

/**
 * Wallet-based login for learner / employee flows.
 * Client signs a purpose-bound message; server verifies signature and looks up user by walletAddress.
 */
export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { walletAddress, timestampIso, message, signature } =
      bodySchema.parse(json);

    verifyPhantomAuthPayload({
      purpose: "login",
      resourceId: "login",
      walletAddress,
      timestampIso,
      payload: { message, signature },
    });

    const user = await prisma.user.findUnique({
      where: { walletAddress },
      select: {
        userId: true,
        role: true,
        walletAddress: true,
        company: { select: { id: true, slug: true } },
        employment: {
          select: {
            companyId: true,
            company: { select: { slug: true } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "No account for this wallet" },
        { status: 404 },
      );
    }

    const companyId =
      user.role === "OWNER"
        ? (user.company?.id ?? null)
        : user.role === "EMPLOYEE"
          ? (user.employment?.companyId ?? null)
          : null;

    let companySlug =
      user.role === "OWNER"
        ? (user.company?.slug ?? null)
        : user.role === "EMPLOYEE"
          ? (user.employment?.company?.slug ?? null)
          : null;

    // Fallback if relation shape ever misses slug but companyId is known.
    if (!companySlug && companyId) {
      const row = await prisma.company.findUnique({
        where: { id: companyId },
        select: { slug: true },
      });
      companySlug = row?.slug ?? null;
    }

    return NextResponse.json({
      userId: user.userId,
      role: user.role,
      companyId,
      companySlug,
      walletAddress: user.walletAddress,
    });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/auth/login]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
