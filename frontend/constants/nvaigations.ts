type NavItem = {
  label: string;
  href: string;
  disabled: boolean;
};

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", disabled: false },
  { label: "Modules", href: "/modules", disabled: false },
  { label: "Employees", href: "/team", disabled: false },
  { label: "Settings", href: "/settings", disabled: false },
];
