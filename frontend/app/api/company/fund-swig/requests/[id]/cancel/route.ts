import { NextResponse } from "next/server";
import { z } from "zod";
import { FundingRequestStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

const bodySchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { companyId, walletAddress } = bodySchema.parse(body);

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      include: { owner: true },
    });
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }
    if (company.owner.walletAddress !== walletAddress) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const request = await prisma.fundingRequest.findUnique({
      where: { id },
    });
    if (!request || request.companyId !== companyId) {
      return NextResponse.json({ error: "Request not found" }, { status: 404 });
    }
    if (request.status !== FundingRequestStatus.PENDING) {
      return NextResponse.json(
        { error: "Only pending requests can be cancelled" },
        { status: 409 },
      );
    }

    await prisma.fundingRequest.update({
      where: { id },
      data: {
        status: FundingRequestStatus.CANCELLED,
        decidedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/company/fund-swig/requests/[id]/cancel]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
