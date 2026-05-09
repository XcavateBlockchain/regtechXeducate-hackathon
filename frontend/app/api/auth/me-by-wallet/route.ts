import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const walletAddress = new URL(req.url).searchParams.get("walletAddress");

  if (!walletAddress || walletAddress.length < 32) {
    return NextResponse.json(
      { error: "walletAddress required" },
      { status: 400 },
    );
  }

  const user = await prisma.user.findUnique({
    where: { walletAddress },
    select: {
      userId: true,
      role: true,
      walletAddress: true,
      company: { select: { id: true, slug: true } },
      employment: {
        select: { companyId: true, company: { select: { slug: true } } },
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

  const companySlug =
    user.role === "OWNER"
      ? (user.company?.slug ?? null)
      : user.role === "EMPLOYEE"
        ? (user.employment?.company?.slug ?? null)
        : null;

  return NextResponse.json({
    userId: user.userId,
    role: user.role,
    companyId,
    companySlug,
    walletAddress: user.walletAddress,
  });
}
