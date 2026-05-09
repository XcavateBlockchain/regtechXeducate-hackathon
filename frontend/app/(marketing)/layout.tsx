import UserHeader from "@/components/layouts/user-header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div>
      <UserHeader />
      {children}
    </div>
  );
}
