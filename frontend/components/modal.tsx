"use client";

import * as React from "react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

interface BaseProps {
  children: React.ReactNode;
}

interface RootModalProps extends BaseProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  disablePointerDismissal?: boolean;
}

interface ModalProps extends BaseProps {
  className?: string;
  asChild?: true;
  showCloseButton?: boolean;
}

const desktop = "(min-width: 768px)";

const ModalContext = React.createContext<{ isDesktop: boolean } | null>(null);

const useModalContext = () => {
  const ctx = React.useContext(ModalContext);
  if (!ctx) {
    throw new Error("Modal subcomponents must be used within <Modal>");
  }
  return ctx;
};

const Modal = ({ children, ...props }: RootModalProps) => {
  const isDesktop = useMediaQuery(desktop);
  const Root = isDesktop ? Dialog : Drawer;
  const focusProps = isDesktop
    ? { disablePointerDismissal: props.disablePointerDismissal }
    : {};

  return (
    <ModalContext.Provider value={{ isDesktop }}>
      <Root {...props} {...focusProps}>
        {children}
      </Root>
    </ModalContext.Provider>
  );
};

const ModalTrigger = ({ className, children, ...props }: ModalProps) => {
  const { isDesktop } = useModalContext();
  const Trigger = isDesktop ? DialogTrigger : DrawerTrigger;

  return (
    <Trigger className={className} {...props}>
      {children}
    </Trigger>
  );
};

const ModalClose = ({ className, children, ...props }: ModalProps) => {
  const { isDesktop } = useModalContext();
  const Close = isDesktop ? DialogClose : DrawerClose;

  return (
    <Close className={className} {...props}>
      {children}
    </Close>
  );
};

const ModalContent = ({ className, children, ...props }: ModalProps) => {
  const { isDesktop } = useModalContext();
  const { showCloseButton } = props;
  const Content = isDesktop ? DialogContent : DrawerContent;
  const focusProps = isDesktop
    ? { initialFocus: false as const, showCloseButton: showCloseButton }
    : { onOpenAutoFocus: (e: Event) => e.preventDefault() };
  return (
    <Content
      className={cn(
        "rounded-t-3xl sm:rounded-[10px] md:max-w-[360px] [&>button]:right-[16px] [&>button]:top-[16px]",
        className,
      )}
      {...focusProps}
      {...props}
    >
      {children}
    </Content>
  );
};

const ModalDescription = ({ className, children, ...props }: ModalProps) => {
  const { isDesktop } = useModalContext();
  const Description = isDesktop ? DialogDescription : DrawerDescription;

  return (
    <Description className={className} {...props}>
      {children}
    </Description>
  );
};

const ModalHeader = ({ className, children, ...props }: ModalProps) => {
  const { isDesktop } = useModalContext();
  const Header = isDesktop ? DialogHeader : DrawerHeader;

  return (
    <Header className={cn("space-y-0 pb-6 md:pb-3", className)} {...props}>
      {children}
    </Header>
  );
};

const ModalTitle = ({ className, children, ...props }: ModalProps) => {
  const { isDesktop } = useModalContext();
  const Title = isDesktop ? DialogTitle : DrawerTitle;

  return (
    <Title className={cn("text-center", className)} {...props}>
      {children}
    </Title>
  );
};

const ModalBody = ({ className, children, ...props }: ModalProps) => {
  return (
    <ScrollArea
      className={cn(
        "h-[234px] max-h-[300px] px-6 md:-mr-4 md:h-full md:min-h-[260px] md:px-0 md:pr-4",
        className,
      )}
      {...props}
    >
      {children}
    </ScrollArea>
  );
};

const ModalFooter = ({ className, children, ...props }: ModalProps) => {
  const { isDesktop } = useModalContext();
  const Footer = isDesktop ? DialogFooter : DrawerFooter;

  return (
    <Footer className={cn("py-3.5 md:py-0", className)} {...props}>
      {children}
    </Footer>
  );
};

export {
  Modal,
  ModalTrigger,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
};
