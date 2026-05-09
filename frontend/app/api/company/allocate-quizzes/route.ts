import { NextResponse } from "next/server";
import { z } from "zod";
import {
  findPartnerPda,
  getAllocateQuizzesInstructionAsync,
} from "@/generated/reg_tech";
import { prisma } from "@/lib/prisma";
import {
  getAdminSigner,
  sendServerTransaction,
  uuidToBytes,
} from "@/lib/solana/admin";

const bodySchema = z.object({
  companyId: z.string().min(1),
  walletAddress: z.string().min(32),
  count: z.number().int().min(1).max(10_000),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { companyId, walletAddress, count } = bodySchema.parse(body);

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
    if (!company.txConfirmed) {
      return NextResponse.json(
        { error: "Company not yet registered on-chain" },
        { status: 400 },
      );
    }

    const adminSigner = await getAdminSigner();
    const partnerIdBytes = uuidToBytes(company.partnerId);
    const [partnerPda] = await findPartnerPda({ partnerId: partnerIdBytes });

    const ix = await getAllocateQuizzesInstructionAsync({
      admin: adminSigner,
      partner: partnerPda,
      count,
    });

    const txHash = await sendServerTransaction(adminSigner, [ix]);

    return NextResponse.json({ txHash }, { status: 200 });
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    console.error("[POST /api/company/allocate-quizzes]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
