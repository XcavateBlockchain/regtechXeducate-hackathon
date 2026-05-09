import UserHeader from "@/components/layouts/user-header";

export default function UserLayout({
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
