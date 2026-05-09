import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    if (!token || token.length < 8) {
      return NextResponse.json({ error: "token required" }, { status: 400 });
    }

    const invite = await prisma.invite.findUnique({
      where: { token },
      select: {
        email: true,
        inviteeName: true,
        permission: true,
        expiresAt: true,
        claimedAt: true,
        company: { select: { name: true } },
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const now = new Date();
    const expired = invite.expiresAt.getTime() <= now.getTime();
    const claimed = !!invite.claimedAt;

    return NextResponse.json(
      {
        invite: {
          companyName: invite.company.name,
          email: invite.email,
          inviteeName: invite.inviteeName,
          permission: invite.permission,
          expired,
          claimed,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[GET /api/invite/:token]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
