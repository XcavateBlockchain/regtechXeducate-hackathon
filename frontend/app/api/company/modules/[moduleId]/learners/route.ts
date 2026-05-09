import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ moduleId: string }> },
) {
  try {
    const { moduleId } = await params;
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

    const module = await prisma.module.findFirst({
      where: { id: moduleId, companyId: company.id },
      select: { id: true },
    });
    if (!module) {
      return NextResponse.json({ error: "Module not found" }, { status: 404 });
    }

    const [assignments, enrollments] = await Promise.all([
      prisma.moduleAssignment.findMany({
        where: { moduleId },
        orderBy: { assignedAt: "desc" },
        select: {
          employeeId: true,
          status: true,
          assignedAt: true,
          completedAt: true,
          finalScoreBps: true,
          employee: {
            select: {
              userId: true,
              user: {
                select: {
                  name: true,
                  email: true,
                  walletAddress: true,
                  avatarUrl: true,
                },
              },
            },
          },
        },
      }),
      prisma.moduleEnrollment.findMany({
        where: { moduleId },
        orderBy: { joinedAt: "desc" },
        select: {
          userId: true,
          status: true,
          joinedAt: true,
          completedAt: true,
          finalScoreBps: true,
          user: {
            select: {
              name: true,
              email: true,
              walletAddress: true,
              avatarUrl: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json(
      {
        employees: assignments.map((a) => ({
          employeeId: a.employeeId,
          userId: a.employee.userId,
          name: a.employee.user.name,
          email: a.employee.user.email,
          walletAddress: a.employee.user.walletAddress,
          avatarUrl: a.employee.user.avatarUrl,
          status: a.status,
          enrolledAt: a.assignedAt,
          completedAt: a.completedAt,
          finalScoreBps: a.finalScoreBps,
        })),
        users: enrollments.map((e) => ({
          userId: e.userId,
          name: e.user.name,
          email: e.user.email,
          walletAddress: e.user.walletAddress,
          avatarUrl: e.user.avatarUrl,
          status: e.status,
          enrolledAt: e.joinedAt,
          completedAt: e.completedAt,
          finalScoreBps: e.finalScoreBps,
        })),
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[GET /api/company/modules/:moduleId/learners]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
