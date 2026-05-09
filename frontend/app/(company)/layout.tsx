import SiteHeader from "@/components/layouts/site-header";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-1 min-h-screen flex-col">
      <SiteHeader />
      {children}
    </div>
  );
}
