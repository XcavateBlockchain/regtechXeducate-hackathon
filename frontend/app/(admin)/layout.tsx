import SiteHeader from "@/components/layouts/site-header";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-screen flex-col">
      <SiteHeader />
      <main className="flex flex-1 flex-col px-4 py-8 md:px-8">{children}</main>
    </div>
  );
}
