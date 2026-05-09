import { prisma } from "@/lib/prisma";

export type CompanyAccess =
  | {
      ok: true;
      companyId: string;
      companySlug: string;
      role: "OWNER" | "EMPLOYEE";
    }
  | { ok: false };

export async function getCompanyAccessBySlug(args: {
  slug: string;
  walletAddress: string;
}): Promise<CompanyAccess> {
  const { slug, walletAddress } = args;

  const user = await prisma.user.findUnique({
    where: { walletAddress },
    select: {
      role: true,
      company: { select: { id: true, slug: true } },
      employment: { select: { company: { select: { id: true, slug: true } } } },
    },
  });

  if (!user) return { ok: false };

  if (user.role === "OWNER") {
    if (user.company?.slug !== slug || !user.company?.id) return { ok: false };
    return {
      ok: true,
      companyId: user.company.id,
      companySlug: user.company.slug,
      role: "OWNER",
    };
  }

  if (user.role === "EMPLOYEE") {
    const c = user.employment?.company;
    if (!c?.id || c.slug !== slug) return { ok: false };
    return { ok: true, companyId: c.id, companySlug: c.slug, role: "EMPLOYEE" };
  }

  return { ok: false };
}
