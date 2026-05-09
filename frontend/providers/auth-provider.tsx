"use client";

import { useDisconnect } from "@phantom/react-sdk";
import { usePathname } from "next/navigation";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
} from "react";
import { Modal, ModalContent } from "@/components/modal";
import { CreateCompanyForm } from "@/features/auth/create-company-from";
import { LoginForm } from "@/features/auth/login-form";
import { SigninOptions } from "@/features/auth/signin-options";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { getUserByWallet } from "@/lib/actions/user";

type AuthPage = 0 | 1 | 2;
type AuthIntent = "login" | "register-owner";

const CloseIcon = () => (
  <svg
    aria-hidden="true"
    width="16px"
    height="16px"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M5 5L19 19M19 5L5 19"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    ></path>
  </svg>
);

export const storageKeys = {
  role: "ROLE",
  user: "USER_ID",
  company: "COMPANY_ID",
  employee: "EMPLOYEE_ID",
  /** Explicit UI choice: general vs owner sign-in flow. */
  authIntent: "AUTH_INTENT",
  /** Survives Phantom OAuth full-page redirect (session tab scope). */
  pendingAuthIntent: "PENDING_AUTH_INTENT",
  /**
   * Pathname-only (e.g. `/invite/token`) stored before Google OAuth — read on `/auth/callback`.
   * Must stay same-origin as `NEXT_PUBLIC_APP_URL` invite links.
   */
  postPhantomReturnPath: "REGTECH_POST_PHANTOM_PATH",
};

export type StoredAuthIntent = "general" | "owner";

export function clearPendingAuthIntent() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(storageKeys.pendingAuthIntent);
}

export function setStoredAuthIntent(intent: StoredAuthIntent) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKeys.authIntent, intent);
}

export function getStoredAuthIntent(): StoredAuthIntent | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(storageKeys.authIntent);
  return raw === "general" || raw === "owner" ? raw : null;
}

export function clearStoredAuthIntent() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(storageKeys.authIntent);
}

function shouldDeferWalletProfileModal(pathname: string | null): boolean {
  if (!pathname) return false;
  if (pathname.startsWith("/invite")) return true;
  if (pathname.startsWith("/auth/")) return true;
  return /^\/m\/[^/]+\/join/.test(pathname);
}

const AuthContext = createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activePage: number;
  setActivePage: React.Dispatch<React.SetStateAction<AuthPage>>;
  accountLoading: boolean;
  setAccountLoading: React.Dispatch<React.SetStateAction<boolean>>;
  intent: AuthIntent;
  setIntent: React.Dispatch<React.SetStateAction<AuthIntent>>;
}>({
  open: false,
  setOpen: () => false,
  activePage: 0,
  setActivePage: () => 0,
  accountLoading: false,
  setAccountLoading: () => false,
  intent: "login",
  setIntent: () => "login",
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [activePage, setActivePage] = useState<AuthPage>(0);
  const [intent, setIntent] = useState<AuthIntent>("login");
  const { disconnect } = useDisconnect();
  const { isConnected, address } = useWalletKit();
  const [accountLoading, setAccountLoading] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const raw = sessionStorage.getItem(storageKeys.pendingAuthIntent);
    if (raw === "login" || raw === "register-owner") {
      setIntent(raw);
    }
  }, []);

  useEffect(() => {
    if (shouldDeferWalletProfileModal(pathname)) return;
    if (isConnected && address) {
      const user = localStorage.getItem(storageKeys.user);
      if (!user) {
        const timeout = setTimeout(() => {
          setAccountLoading(true);
        }, 320);

        return () => clearTimeout(timeout);
      }
    }
  }, [isConnected, address, pathname]);

  useEffect(() => {
    if (accountLoading && address) {
      let ignore = false;
      setOpen(true);
      const checkUser = async () => {
        const sleep = (ms: number) =>
          new Promise<void>((resolve) => setTimeout(resolve, ms));

        // Phantom can report a connected account slightly before the backend/user lookup
        // succeeds (especially right after OAuth callback). Retry briefly to avoid false 404s.
        let user = await getUserByWallet(address ?? "");
        if (!user) {
          await sleep(250);
          user = await getUserByWallet(address ?? "");
        }
        if (!user) {
          await sleep(500);
          user = await getUserByWallet(address ?? "");
        }
        const storedIntent = getStoredAuthIntent();
        if (ignore) return;
        if (!user) {
          if (storedIntent === "general") {
            setBannerError(
              "No account found for this wallet. General accounts are created via invite links (employees) or module links (users).",
            );
            clearStoredAuthIntent();
            clearPendingAuthIntent();
            localStorage.removeItem(storageKeys.role);
            localStorage.removeItem(storageKeys.user);
            localStorage.removeItem(storageKeys.company);
            localStorage.removeItem(storageKeys.employee);
            void disconnect().catch(() => undefined);
            setAccountLoading(false);
            setActivePage(0);
            return;
          }

          setBannerError(null);
          if (storedIntent === "owner" || intent === "register-owner") {
            setActivePage(2);
          } else {
            setActivePage(1);
          }
          setAccountLoading(false);
          return;
        }
        setBannerError(null);
        if (storedIntent === "owner" && user?.role && user.role !== "OWNER") {
          setBannerError(
            `This wallet is registered as a ${user.role.toLowerCase()} account. Please disconnect and sign in with your company owner wallet.`,
          );
          clearStoredAuthIntent();
          localStorage.removeItem(storageKeys.role);
          localStorage.removeItem(storageKeys.user);
          localStorage.removeItem(storageKeys.company);
          localStorage.removeItem(storageKeys.employee);
          void disconnect().catch(() => undefined);
          setAccountLoading(false);
          setActivePage(0);
          return;
        }

        // User exists for this wallet. Require signature-based sign-in via LoginForm
        // (POST /api/auth/login) before persisting USER_ID/ROLE/COMPANY_ID.
        setActivePage(1);
        setAccountLoading(false);
      };
      checkUser();
      return () => {
        ignore = true;
      };
    }
  }, [accountLoading, address, disconnect, intent]);

  const pages: Record<AuthPage, React.ReactNode> = {
    0: <SigninOptions />,
    1: <LoginForm />,
    2: <CreateCompanyForm />,
  };

  return (
    <AuthContext.Provider
      value={{
        open,
        setOpen,
        activePage,
        setActivePage,
        accountLoading,
        setAccountLoading,
        intent,
        setIntent,
      }}
    >
      {children}
      <Modal
        open={open}
        onOpenChange={setOpen}
        // biome-ignore lint/complexity/noUselessTernary: disable pointer dismissal for create company page
        disablePointerDismissal={pages[activePage] === 2 ? true : false}
      >
        <ModalContent
          showCloseButton={false}
          className="md:max-w-[min(400px,calc(100vw-32px))] gap-6 sm:rounded-[20px] border-0 p-4 shadow-none"
        >
          {bannerError ? (
            <div
              role="alert"
              className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {bannerError}
            </div>
          ) : null}
          {pages[activePage] === 2 ? null : (
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="hover:bg-secondary absolute top-4 right-4 rounded-lg p-1.5 transition-colors md:block hidden"
            >
              <CloseIcon />
            </button>
          )}
          {accountLoading ? <ProfileLoading /> : pages[activePage]}
          <p className="text-center text-muted-foreground text-xs">
            By signing up you agree to our{" "}
            <a className="underline hover:no-underline" href="/#">
              Terms
            </a>
            .
          </p>
        </ModalContent>
      </Modal>
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within a AuthProvider");
  }
  return context;
}

export function ProfileLoading() {
  return (
    <div className="flex w-full flex-col items-center justify-center gap-9 md:pt-5">
      <div className="size-[116px] relative flex items-center justify-center rounded-2xl border p-3">
        {/** biome-ignore lint/performance/noImgElement: <\> */}
        <img
          src={"/main_logo.svg"}
          alt="Regtech"
          className="size-full overflow-hidden animate-pulse rounded-2xl"
        />
      </div>

      <div className="space-y-3.5 px-3.5 text-center sm:px-0">
        <h1 className="text-xl font-semibold">{"Fetching profile..."}</h1>
        <p className="text-balance text-sm text-muted-foreground">
          {"Please wait while we fetch your profile..."}
        </p>
      </div>
    </div>
  );
}
