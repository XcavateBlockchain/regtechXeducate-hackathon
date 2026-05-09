import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { inviteCreateSchema } from "@/lib/validations/invite-schema";

const listSchema = z.object({
  walletAddress: z.string().min(32),
});

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get("walletAddress") ?? "";
    const { walletAddress: parsedWallet } = listSchema.parse({ walletAddress });

    const company = await prisma.company.findFirst({
      where: { owner: { walletAddress: parsedWallet } },
      select: { id: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const invites = await prisma.invite.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        inviteeName: true,
        permission: true,
        token: true,
        expiresAt: true,
        claimedAt: true,
        claimedBy: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ invites }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[GET /api/company/invites]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const data = inviteCreateSchema.parse(json);

    const company = await prisma.company.findUnique({
      where: { id: data.companyId },
      include: { owner: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.owner.walletAddress !== data.walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const existingEmployee = await prisma.employee.findFirst({
      where: { user: { email: data.email } },
      select: { id: true, companyId: true },
    });
    if (existingEmployee) {
      const sameCompany = existingEmployee.companyId === data.companyId;
      return NextResponse.json(
        {
          error: sameCompany
            ? "This email is already an employee in your company"
            : "This email is already an employee at another company",
        },
        { status: 409 },
      );
    }

    const expiresAt = addDays(new Date(), 7);
    const invite = await prisma.invite.create({
      data: {
        companyId: data.companyId,
        email: data.email,
        inviteeName: data.inviteeName,
        permission: data.permission,
        expiresAt,
      },
      select: { id: true, token: true, expiresAt: true },
    });

    return NextResponse.json(
      {
        inviteId: invite.id,
        token: invite.token,
        expiresAt: invite.expiresAt,
      },
      { status: 201 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/company/invites]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
