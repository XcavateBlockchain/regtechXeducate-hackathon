"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ModalDescription, ModalHeader, ModalTitle } from "@/components/modal";
import NativeSelect from "@/components/native-select";
import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field-input";
import Form, { useZodForm } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import { cn } from "@/lib/utils";
import { type AuthValues, authSchema } from "@/lib/validations/auth-schema";
import {
  clearPendingAuthIntent,
  clearStoredAuthIntent,
  storageKeys,
  useAuthContext,
} from "@/providers/auth-provider";

type Step = 0 | 1 | 2;

const STEP_LABELS: Record<Step, string> = {
  0: "Sign up",
  1: "Create account",
  2: "Setting up company…",
};

const STEP_DESCRIPTIONS: Record<Step, string> = {
  0: "Your profile as the company owner.",
  1: "Your organization — you can change details later.",
  2: "Creating your company wallet on-chain.",
};

export function CreateCompanyForm() {
  const [page, setPage] = useState<Step>(0);
  const { address, isConnected } = useWalletKit();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const { handleDisconnect } = useWalletKit();
  const { setOpen, setActivePage } = useAuthContext();

  const form = useZodForm({
    schema: authSchema,
    defaultValues: {
      walletAddress: address ?? "",
      name: "",
      email: "",
      role: "OWNER" as const,
      companyName: "",
      companySlug: "",
      description: "",
    },
  });

  const isLoading = page === 2;

  async function handleSubmit(values: AuthValues) {
    if (!address || !isConnected) return;
    setError(null);
    setPage(2);

    try {
      // Create user + company in DB
      const registerRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          walletAddress: address,
          name: values.name,
          email: values.email,
          companyName: values.companyName,
          companySlug: values.companySlug,
          industry: values.industry,
          description: values.description ?? "",
        }),
      });

      if (!registerRes.ok) {
        const body = (await registerRes.json()) as { error: string };
        throw new Error(body.error ?? "Registration failed");
      }

      const { companyId, userId } = (await registerRes.json()) as {
        userId: string;
        companyId: string;
      };

      clearPendingAuthIntent();
      clearStoredAuthIntent();
      setOpen(false);
      setActivePage(0);
      localStorage.setItem(storageKeys.role, "OWNER");
      localStorage.setItem(storageKeys.user, userId);
      localStorage.setItem(storageKeys.company, companyId);
      router.push(`/${encodeURIComponent(values.companySlug)}`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Something went wrong. Try again.",
      );
      setPage(2);
    }
  }

  return (
    <>
      {error ? (
        <div
          role="alert"
          className="rounded-[10px] border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      <div className="flex flex-col items-start gap-2 mb-4">
        {page === 1 && (
          <button
            type="button"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => {
              setPage(1);
              setError(null);
            }}
            disabled={isLoading}
          >
            <ArrowLeft className="size-5" strokeWidth={1.75} />
            Back
          </button>
        )}

        <ModalHeader
          className={cn(
            "flex items-start flex-col gap-0 md:pb-0",

            {
              "mt-6": page === 0,
            },
          )}
        >
          <ModalTitle className="text-sm font-semibold">
            {STEP_LABELS[page]}
          </ModalTitle>
          <ModalDescription className="text-center">
            {STEP_DESCRIPTIONS[page]}
          </ModalDescription>
        </ModalHeader>
      </div>
      <Form
        form={form}
        autoComplete="off"
        onSubmit={form.handleSubmit(handleSubmit)}
      >
        {page === 0 ? (
          <>
            <FieldInput
              {...form.register("walletAddress")}
              error={form.formState.errors.walletAddress}
              label="Wallet Address"
              placeholder="0x1234567890"
              type="text"
              autoComplete="off"
              disabled={true}
              required
            />
            <FieldInput
              {...form.register("name")}
              error={form.formState.errors.name}
              label="Name"
              placeholder="Your name"
              type="text"
              autoComplete="off"
              required
            />
            <FieldInput
              {...form.register("email")}
              error={form.formState.errors.email}
              label="Email"
              placeholder="you@example.com"
              type="email"
              autoComplete="email"
              required
            />
            <div className="flex items-center justify-end gap-2">
              <Button
                size="lg"
                type="button"
                variant="outline"
                onClick={handleDisconnect}
              >
                Cancel
              </Button>
              <Button
                size="lg"
                type="button"
                disabled={!isConnected || !address}
                onClick={() => setPage(1)}
              >
                Continue
              </Button>
            </div>
          </>
        ) : page === 1 ? (
          <>
            <FieldInput
              {...form.register("companyName")}
              error={form.formState.errors.companyName}
              label="Company name"
              placeholder="Acme Compliance"
            />
            <FieldInput
              {...form.register("companySlug")}
              error={form.formState.errors.companySlug}
              label="Company URL"
              placeholder=""
              addOn={
                <span className="text-muted-foreground text-sm">
                  regtech.com
                </span>
              }
            />
            <NativeSelect
              {...form.register("industry")}
              name="industry"
              label="Industry"
              options={[
                { label: "Real Estate", value: "Real Estate" },
                { label: "Marketplace", value: "Marketplace" },
                { label: "Defi", value: "Defi" },
                { label: "Other", value: "Other" },
              ]}
              placeholder="Select Industry"
              required
            />
            <div className="flex w-full flex-col gap-1">
              <Label htmlFor="signup-description">Description (optional)</Label>
              <Textarea
                id="signup-description"
                rows={3}
                aria-invalid={!!form.formState.errors.description}
                placeholder="Briefly describe your company"
                {...form.register("description")}
              />
              {form.formState.errors.description ? (
                <p className="text-destructive text-xs">
                  {form.formState.errors.description.message}
                </p>
              ) : null}
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                size="lg"
                type="submit"
                disabled={!isConnected || isLoading}
              >
                {isLoading ? "Creating…" : "Create account"}
              </Button>
            </div>
          </>
        ) : (
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
              <h1 className="text-xl font-semibold">
                {"Setting up company..."}
              </h1>
              <p className="text-balance text-sm text-muted-foreground">
                Setting up your company wallet on-chain. This can take a moment.
              </p>
            </div>
          </div>
        )}
      </Form>
    </>
  );
}
