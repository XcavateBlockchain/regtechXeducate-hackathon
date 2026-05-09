import { NextResponse } from "next/server";
import { getCompanyAccessBySlug } from "@/lib/company-access";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await ctx.params;
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress || walletAddress.length < 32) {
      return NextResponse.json(
        { error: "walletAddress required" },
        { status: 400 },
      );
    }

    const access = await getCompanyAccessBySlug({ slug, walletAddress });
    if (!access.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const [
      activeModules,
      credentialsIssued,
      employees,
      publicEnrolled,
      totalEmployeeEnrolments,
      totalUserEnrolments,
      distinctEmployeeLearners,
      distinctUserLearners,
      companyTxCount,
      moduleTxCount,
      credentialTxCount,
      fundingTxCount,
    ] = await Promise.all([
      prisma.module.count({
        where: { companyId: access.companyId, status: "ACTIVE" },
      }),
      prisma.credential.count({
        where: { issuingCompanyId: access.companyId },
      }),
      prisma.employee.count({
        where: { companyId: access.companyId },
      }),
      prisma.moduleEnrollment.count({
        where: { module: { companyId: access.companyId } },
      }),
      prisma.moduleAssignment.count({
        where: { module: { companyId: access.companyId } },
      }),
      prisma.moduleEnrollment.count({
        where: { module: { companyId: access.companyId } },
      }),
      prisma.moduleAssignment.groupBy({
        by: ["employeeId"],
        where: { module: { companyId: access.companyId } },
      }),
      prisma.moduleEnrollment.groupBy({
        by: ["userId"],
        where: { module: { companyId: access.companyId } },
      }),
      prisma.company.count({
        where: { id: access.companyId, txHash: { not: null } },
      }),
      prisma.module.count({
        where: { companyId: access.companyId, txHash: { not: null } },
      }),
      prisma.credential.count({
        where: { issuingCompanyId: access.companyId, txSignature: { not: "" } },
      }),
      prisma.fundingRequest.count({
        where: { companyId: access.companyId, txHash: { not: null } },
      }),
    ]);

    const transactionsCount =
      companyTxCount + moduleTxCount + credentialTxCount + fundingTxCount;
    const totalEnrolments = totalEmployeeEnrolments + totalUserEnrolments;
    const totalLearners =
      distinctEmployeeLearners.length + distinctUserLearners.length;

    return NextResponse.json(
      {
        activeModules,
        credentialsIssued,
        certificatesIssued: credentialsIssued,
        employees,
        publicEnrolled,
        totalEnrolments,
        totalLearners,
        transactionsCount,
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[GET /api/company/[slug]/stats]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
