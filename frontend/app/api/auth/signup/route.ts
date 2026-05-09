import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const signupSchema = z.object({
  walletAddress: z.string().min(32),
  name: z.string().min(1),
  email: z.email(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = signupSchema.parse(body);

    // Check for duplicates
    const [existingWallet, existingEmail] = await Promise.all([
      prisma.user.findUnique({
        where: { walletAddress: data.walletAddress },
      }),
      prisma.user.findUnique({ where: { email: data.email } }),
    ]);

    if (existingWallet) {
      return NextResponse.json(
        { error: "Wallet already registered" },
        { status: 409 },
      );
    }
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 },
      );
    }

    // Create User + Company in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          userId: `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
          walletAddress: data.walletAddress,
          name: data.name,
          email: data.email,
          role: "USER",
        },
      });

      return user;
    });
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/auth/signup]", e);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
