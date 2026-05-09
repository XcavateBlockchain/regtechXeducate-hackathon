"use client";

import { XIcon } from "lucide-react";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface BaseProps {
  children: React.ReactNode;
}

interface RootPopMenuProps extends BaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** When true, outside pointer / overlay dismissal is disabled (drawer: `dismissible={false}`). Popover has no equivalent; default outside-press behavior applies on desktop. */
  disablePointerDismissal?: boolean;
}

type PopoverContentPositionProps = Pick<
  React.ComponentProps<typeof PopoverContent>,
  "align" | "alignOffset" | "side" | "sideOffset" | "anchor"
>;

interface PopMenuProps extends BaseProps, Partial<PopoverContentPositionProps> {
  className?: string;
  asChild?: true;
  /** Desktop popover only; defaults true (matches previous dialog content). */
  showCloseButton?: boolean;
}

const desktop = "(min-width: 768px)";

/** Popover positioning + content-only props; strip before forwarding to triggers / drawer primitives. */
function stripPopMenuChromeProps<P extends PopMenuProps>(props: P) {
  const {
    showCloseButton: _sc,
    align: _a,
    alignOffset: _ao,
    side: _s,
    sideOffset: _so,
    anchor: _an,
    ...rest
  } = props;
  return rest;
}

const PopMenuContext = React.createContext<{ isDesktop: boolean } | null>(null);

const usePopMenuContext = () => {
  const ctx = React.useContext(PopMenuContext);
  if (!ctx) {
    throw new Error("PopMenu subcomponents must be used within <PopMenu>");
  }
  return ctx;
};

const PopMenu = ({
  children,
  disablePointerDismissal,
  ...rest
}: RootPopMenuProps) => {
  const isDesktop = useMediaQuery(desktop);

  return (
    <PopMenuContext.Provider value={{ isDesktop }}>
      {isDesktop ? (
        <Popover {...rest}>{children}</Popover>
      ) : (
        <Drawer
          {...rest}
          dismissible={disablePointerDismissal ? false : undefined}
        >
          {children}
        </Drawer>
      )}
    </PopMenuContext.Provider>
  );
};

const PopMenuTrigger = (props: PopMenuProps) => {
  const { isDesktop } = usePopMenuContext();
  const Trigger = isDesktop ? PopoverTrigger : DrawerTrigger;
  const { className, children, ...rest } = stripPopMenuChromeProps(props);

  return (
    <Trigger className={className} {...rest}>
      {children}
    </Trigger>
  );
};

const PopMenuClose = (props: PopMenuProps) => {
  const { isDesktop } = usePopMenuContext();
  const Close = isDesktop ? PopoverClose : DrawerClose;
  const { className, children, ...rest } = stripPopMenuChromeProps(props);

  return (
    <Close className={className} {...rest}>
      {children}
    </Close>
  );
};

const PopMenuContent = ({
  className,
  children,
  showCloseButton = true,
  align,
  alignOffset,
  side,
  sideOffset,
  anchor,
  ...props
}: PopMenuProps) => {
  const { isDesktop } = usePopMenuContext();

  if (isDesktop) {
    return (
      <PopoverContent
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        anchor={anchor}
        className={cn(
          "relative w-[min(360px,calc(100vw-2rem))] max-w-[360px] gap-4 p-4 [&:has([data-slot=popover-close])]:pr-10",
          "rounded-t-3xl sm:rounded-[10px] md:max-w-[360px]",
          className,
        )}
        {...props}
        initialFocus={false}
      >
        {showCloseButton ? (
          <PopoverClose
            className="absolute top-2 right-2"
            render={<Button variant="ghost" size="icon-sm" />}
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </PopoverClose>
        ) : null}
        {children}
      </PopoverContent>
    );
  }

  return (
    <DrawerContent
      className={cn(
        "rounded-t-3xl sm:rounded-[10px] md:max-w-[360px]",
        className,
      )}
      onOpenAutoFocus={(e) => e.preventDefault()}
      {...props}
    >
      {children}
    </DrawerContent>
  );
};

const PopMenuDescription = (props: PopMenuProps) => {
  const { isDesktop } = usePopMenuContext();
  const Description = isDesktop ? PopoverDescription : DrawerDescription;
  const { className, children, ...rest } = stripPopMenuChromeProps(props);

  return (
    <Description className={className} {...rest}>
      {children}
    </Description>
  );
};

const PopMenuHeader = (props: PopMenuProps) => {
  const { isDesktop } = usePopMenuContext();
  const Header = isDesktop ? PopoverHeader : DrawerHeader;
  const { className, children, ...rest } = stripPopMenuChromeProps(props);

  return (
    <Header className={cn("space-y-0 pb-6 md:pb-3", className)} {...rest}>
      {children}
    </Header>
  );
};

const PopMenuTitle = (props: PopMenuProps) => {
  const { isDesktop } = usePopMenuContext();
  const Title = isDesktop ? PopoverTitle : DrawerTitle;
  const { className, children, ...rest } = stripPopMenuChromeProps(props);

  return (
    <Title className={cn("text-center", className)} {...rest}>
      {children}
    </Title>
  );
};

const PopMenuBody = (props: PopMenuProps) => {
  const { className, children, ...rest } = stripPopMenuChromeProps(props);

  return (
    <ScrollArea
      className={cn(
        "h-[234px] max-h-[300px] px-6 md:-mr-4 md:h-full md:min-h-[260px] md:px-0 md:pr-4",
        className,
      )}
      {...rest}
    >
      {children}
    </ScrollArea>
  );
};

const PopMenuFooter = (props: PopMenuProps) => {
  const { isDesktop } = usePopMenuContext();
  const { className, children, ...rest } = stripPopMenuChromeProps(props);

  if (isDesktop) {
    return (
      <div
        className={cn(
          "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:gap-2",
          "py-3.5 md:py-0",
          className,
        )}
        {...rest}
      >
        {children}
      </div>
    );
  }

  return (
    <DrawerFooter className={cn("py-3.5 md:py-0", className)} {...rest}>
      {children}
    </DrawerFooter>
  );
};

export {
  PopMenu,
  PopMenuTrigger,
  PopMenuClose,
  PopMenuContent,
  PopMenuDescription,
  PopMenuHeader,
  PopMenuTitle,
  PopMenuBody,
  PopMenuFooter,
};
