import { NextResponse } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { verifyPhantomAuthPayload } from "@/lib/phantom-auth";
import { prisma } from "@/lib/prisma";

function newExternalUserId() {
  return `usr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
}

/** Sentinel: thrown inside the tx, translated to a 409 by the outer handler. */
class AlreadyEmployedError extends Error {
  constructor(public sameCompany: boolean) {
    super(
      sameCompany
        ? "You're already a member of this company."
        : "This account is already an employee at another company.",
    );
    this.name = "AlreadyEmployedError";
  }
}

const tokenSchema = z.object({
  token: z.string().min(8),
});

const bodySchema = z.object({
  name: z.string().max(200).optional(),
  walletAddress: z.string().min(32),
  timestampIso: z.string().min(1),
  message: z.string().min(1),
  signature: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = tokenSchema.parse(await params);
    const json = await req.json();
    const { name, walletAddress, timestampIso, message, signature } =
      bodySchema.parse(json);

    verifyPhantomAuthPayload({
      purpose: "invite-claim",
      resourceId: token,
      walletAddress,
      timestampIso,
      payload: { message, signature },
    });

    const invite = await prisma.invite.findUnique({
      where: { token },
      select: {
        id: true,
        email: true,
        inviteeName: true,
        companyId: true,
        permission: true,
        expiresAt: true,
        claimedAt: true,
        company: { select: { ownerId: true } },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (invite.claimedAt) {
      return NextResponse.json(
        { error: "Invite already claimed" },
        { status: 409 },
      );
    }
    const now = new Date();
    if (invite.expiresAt.getTime() <= now.getTime()) {
      return NextResponse.json({ error: "Invite expired" }, { status: 410 });
    }

    const resolvedName = (
      invite.inviteeName?.trim() ||
      name?.trim() ||
      ""
    ).trim();
    if (!resolvedName) {
      return NextResponse.json(
        { error: "Name is required to claim this invite" },
        { status: 400 },
      );
    }

    const existingByEmail = await prisma.user.findUnique({
      where: { email: invite.email },
      select: { id: true, walletAddress: true, role: true },
    });
    const existingByWallet = await prisma.user.findUnique({
      where: { walletAddress },
      select: { id: true, email: true, role: true },
    });

    if (
      existingByEmail &&
      existingByWallet &&
      existingByEmail.id !== existingByWallet.id
    ) {
      return NextResponse.json(
        { error: "Email and wallet belong to different accounts" },
        { status: 409 },
      );
    }

    if (existingByEmail && existingByEmail.role !== "EMPLOYEE") {
      return NextResponse.json(
        { error: "Email already belongs to a non-employee account" },
        { status: 409 },
      );
    }
    if (existingByWallet && existingByWallet.role !== "EMPLOYEE") {
      return NextResponse.json(
        { error: "Wallet already belongs to a non-employee account" },
        { status: 409 },
      );
    }

    const existingUserId = existingByEmail?.id ?? existingByWallet?.id ?? null;
    if (existingUserId) {
      const existingEmployee = await prisma.employee.findUnique({
        where: { userId: existingUserId },
        select: { companyId: true },
      });
      if (existingEmployee) {
        const sameCompany = existingEmployee.companyId === invite.companyId;
        return NextResponse.json(
          {
            error: sameCompany
              ? "You're already a member of this company."
              : "This account is already an employee at another company.",
          },
          { status: 409 },
        );
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      const user = existingByEmail
        ? await tx.user.update({
            where: { id: existingByEmail.id },
            data: { name: resolvedName, walletAddress, role: "EMPLOYEE" },
            select: { id: true, userId: true },
          })
        : existingByWallet
          ? await tx.user.update({
              where: { id: existingByWallet.id },
              data: {
                name: resolvedName,
                email: invite.email,
                role: "EMPLOYEE",
              },
              select: { id: true, userId: true },
            })
          : await tx.user.create({
              data: {
                userId: newExternalUserId(),
                walletAddress,
                name: resolvedName,
                email: invite.email,
                role: "EMPLOYEE",
              },
              select: { id: true, userId: true },
            });

      let employee: { id: string };
      try {
        employee = await tx.employee.create({
          data: {
            userId: user.id,
            companyId: invite.companyId,
            permission: invite.permission,
            inviteId: invite.id,
            invitedAt: now,
            invitedByUserId: invite.company.ownerId,
          },
          select: { id: true },
        });
      } catch (e) {
        if (
          e instanceof Prisma.PrismaClientKnownRequestError &&
          e.code === "P2002"
        ) {
          // Race: an Employee row was created between our pre-check and here.
          const existing = await tx.employee.findUnique({
            where: { userId: user.id },
            select: { companyId: true },
          });
          throw new AlreadyEmployedError(
            existing?.companyId === invite.companyId,
          );
        }
        throw e;
      }

      await tx.invite.update({
        where: { id: invite.id },
        data: {
          claimedAt: now,
          claimedBy: walletAddress,
          employeeId: employee.id,
        },
      });

      return { userId: user.userId, companyId: invite.companyId };
    });

    return NextResponse.json(
      { ...result, role: "EMPLOYEE" as const },
      { status: 200 },
    );
  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: e.issues },
        { status: 400 },
      );
    }
    if (e instanceof AlreadyEmployedError) {
      return NextResponse.json({ error: e.message }, { status: 409 });
    }
    console.error("[POST /api/invite/:token/claim]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
