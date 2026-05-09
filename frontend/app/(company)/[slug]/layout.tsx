import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isReservedSlug } from "@/lib/validations/reserved-slugs";

export default async function CompanySlugLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  if (!slug || isReservedSlug(slug)) notFound();

  const exists = await prisma.company.findUnique({
    where: { slug },
    select: { id: true },
  });
  if (!exists) notFound();

  return children;
}
