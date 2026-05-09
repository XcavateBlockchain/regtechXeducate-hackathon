"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./auth-provider";
import SolanaWalletProvider from "./solana-provider";
import WalletProvider from "./wallet-provider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <div vaul-drawer-wrapper="" className="bg-background">
      <SolanaWalletProvider>
        <TooltipProvider delay={0}>
          <WalletProvider>
            <AuthProvider>{children}</AuthProvider>
          </WalletProvider>
        </TooltipProvider>
      </SolanaWalletProvider>
    </div>
  );
}
