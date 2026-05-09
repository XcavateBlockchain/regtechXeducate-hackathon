import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get("walletAddress");

    if (!walletAddress || walletAddress.length < 32) {
      return NextResponse.json(
        { error: "walletAddress required" },
        { status: 400 },
      );
    }

    const company = await prisma.company.findFirst({
      where: { owner: { walletAddress } },
      select: { id: true },
    });

    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
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
        where: { companyId: company.id, status: "ACTIVE" },
      }),
      prisma.credential.count({
        where: { issuingCompanyId: company.id },
      }),
      prisma.employee.count({
        where: { companyId: company.id },
      }),
      prisma.moduleEnrollment.count({
        where: { module: { companyId: company.id } },
      }),
      prisma.moduleAssignment.count({
        where: { module: { companyId: company.id } },
      }),
      prisma.moduleEnrollment.count({
        where: { module: { companyId: company.id } },
      }),
      prisma.moduleAssignment.groupBy({
        by: ["employeeId"],
        where: { module: { companyId: company.id } },
      }),
      prisma.moduleEnrollment.groupBy({
        by: ["userId"],
        where: { module: { companyId: company.id } },
      }),
      prisma.company.count({
        where: { id: company.id, txHash: { not: null } },
      }),
      prisma.module.count({
        where: { companyId: company.id, txHash: { not: null } },
      }),
      prisma.credential.count({
        where: { issuingCompanyId: company.id, txSignature: { not: "" } },
      }),
      prisma.fundingRequest.count({
        where: { companyId: company.id, txHash: { not: null } },
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
        // Alias "certificates" to "credentials" for UI semantics.
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
    console.error("[GET /api/company/stats]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
