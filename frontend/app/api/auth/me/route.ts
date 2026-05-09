import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const userId = new URL(req.url).searchParams.get("userId");

  if (!userId || userId.length < 8) {
    return NextResponse.json({ error: "userId required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { userId },
    select: {
      userId: true,
      role: true,
      walletAddress: true,
      name: true,
      email: true,
      avatarUrl: true,
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      employment: {
        select: {
          id: true,
          companyId: true,
          company: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const companyId =
    user.role === "OWNER"
      ? (user.company?.id ?? null)
      : user.role === "EMPLOYEE"
        ? (user.employment?.companyId ?? null)
        : null;

  return NextResponse.json({
    userId: user.userId,
    role: user.role,
    companyId,
    walletAddress: user.walletAddress,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    company: user.company,
    employment: user.employment,
  });
}
