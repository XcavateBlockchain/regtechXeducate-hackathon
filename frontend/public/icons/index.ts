import { Bell, ChevronDown, ImageIcon, Info, Menu } from "lucide-react";

const Icon = {
  bell: Bell,
  arrowDown: ChevronDown,
  info: Info,
  image: ImageIcon,
  menu: Menu,
};

export type IconName = keyof typeof Icon;
export default Icon;
