import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ shareToken: string }> },
) {
  try {
    const { shareToken } = await params;
    if (!shareToken || shareToken.length < 8) {
      return NextResponse.json(
        { error: "shareToken required" },
        { status: 400 },
      );
    }

    const module = await prisma.module.findFirst({
      where: { shareToken, status: "ACTIVE" },
      select: {
        id: true,
        name: true,
        description: true,
        thumbnailUrl: true,
        company: { select: { name: true } },
      },
    });

    if (!module) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        module: {
          id: module.id,
          name: module.name,
          description: module.description,
          thumbnailUrl: module.thumbnailUrl,
          companyName: module.company.name,
        },
      },
      { status: 200 },
    );
  } catch (e) {
    console.error("[GET /api/m/:shareToken]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Internal server error" },
      { status: 500 },
    );
  }
}
