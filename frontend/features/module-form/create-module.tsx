"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import Form, { useZodForm } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCompany } from "@/hooks/use-company";
import { useCompanySlug } from "@/hooks/use-company-slug";
import { useQuizBalance } from "@/hooks/use-quiz-balance";
import { useWalletKit } from "@/hooks/use-wallet-kit";
import {
  type ModuleWithQuizValues,
  moduleWithQuizSchema,
} from "@/lib/validations/module-schema";
import ModuleForm from "./module-form";
import ModuleReviewPane from "./module-review-pane";

interface CreateModuleFormProps {
  existingModuleId?: string;
  defaultValues?: Partial<ModuleWithQuizValues>;
}

function buildFormData(
  values: ModuleWithQuizValues,
  companyId: string,
  walletAddress: string,
): FormData {
  const fd = new FormData();
  fd.append("companyId", companyId);
  fd.append("walletAddress", walletAddress);
  const {
    thumbnailImage,
    existingThumbnailUrl: _omitExistingThumb,
    contents,
    ...jsonPayload
  } = values;
  void _omitExistingThumb;
  fd.append("data", JSON.stringify(jsonPayload));
  if (thumbnailImage instanceof File && thumbnailImage.size > 0) {
    fd.append("thumbnail", thumbnailImage);
  }
  for (const file of contents) {
    fd.append("contents", file);
  }
  return fd;
}

function firstError(errors: Record<string, unknown>): string {
  const first = Object.values(errors)[0];
  if (!first) return "Please fix form errors before submitting";
  if (
    typeof first === "object" &&
    first !== null &&
    "message" in first &&
    typeof (first as { message?: unknown }).message === "string"
  ) {
    return (first as { message: string }).message;
  }
  return "Please fix form errors before submitting";
}

function collectErrorMessages(
  errors: Record<string, unknown>,
  prefix = "",
  out: string[] = [],
): string[] {
  for (const [key, value] of Object.entries(errors)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (
      typeof value === "object" &&
      value !== null &&
      "message" in value &&
      typeof (value as { message?: unknown }).message === "string"
    ) {
      out.push(`${path}: ${(value as { message: string }).message}`);
      continue;
    }
    if (typeof value === "object" && value !== null) {
      collectErrorMessages(value as Record<string, unknown>, path, out);
    }
  }
  return out;
}

export default function CreateModuleFrom({
  existingModuleId,
  defaultValues,
}: CreateModuleFormProps = {}) {
  const router = useRouter();
  const { address } = useWalletKit();
  const slug = useCompanySlug();
  const { company } = useCompany(slug, address);
  const { balance: quizBalance, loading: quizBalanceLoading } = useQuizBalance(
    company?.id ?? null,
    address ?? null,
  );
  const [moduleId, setModuleId] = useState<string | null>(
    existingModuleId ?? null,
  );

  const form = useZodForm({
    schema: moduleWithQuizSchema,
    mode: "onBlur",
    defaultValues: {
      mode: "manual",
      title: "",
      description: "",
      contents: [],
      ...defaultValues,
    },
  });

  const resolveModuleId = () => moduleId ?? existingModuleId ?? null;

  async function saveAsDraft(values: ModuleWithQuizValues) {
    if (!slug || !company || !address) {
      toast.error("Wallet not connected or company not loaded");
      return;
    }
    const tid = toast.loading("Saving draft…");
    try {
      const fd = buildFormData(values, company.id, address);
      const id = resolveModuleId();
      if (id) {
        const res = await fetch(
          `/api/company/${encodeURIComponent(slug)}/modules/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            body: fd,
          },
        );
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          throw new Error(json.error ?? "Save failed");
        }
      } else {
        const res = await fetch(
          `/api/company/${encodeURIComponent(slug)}/modules`,
          {
            method: "POST",
            body: fd,
          },
        );
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          throw new Error(json.error ?? "Save failed");
        }
        const json = (await res.json()) as { moduleId: string };
        setModuleId(json.moduleId);
      }
      toast.success("Saved as draft", { id: tid });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed", { id: tid });
    }
  }

  async function onSubmit(values: ModuleWithQuizValues) {
    if (!slug || !company || !address) {
      toast.error("Wallet not connected or company not loaded");
      return;
    }
    let id = resolveModuleId();
    const tid = toast.loading("Publishing module…");
    try {
      const fd = buildFormData(values, company.id, address);
      if (!id) {
        const res = await fetch(
          `/api/company/${encodeURIComponent(slug)}/modules`,
          {
            method: "POST",
            body: fd,
          },
        );
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          throw new Error(json.error ?? "Save failed");
        }
        const json = (await res.json()) as { moduleId: string };
        id = json.moduleId;
        setModuleId(id);
      } else {
        const res = await fetch(
          `/api/company/${encodeURIComponent(slug)}/modules/${encodeURIComponent(id)}`,
          {
            method: "PATCH",
            body: fd,
          },
        );
        if (!res.ok) {
          const json = (await res.json()) as { error?: string };
          throw new Error(json.error ?? "Update failed");
        }
      }
      const pubRes = await fetch(
        `/api/company/${encodeURIComponent(slug)}/modules/${encodeURIComponent(id)}/publish`,
        {
          method: "POST",
          body: JSON.stringify({
            companyId: company.id,
            walletAddress: address,
          }),
          headers: { "Content-Type": "application/json" },
        },
      );
      if (!pubRes.ok) {
        const json = (await pubRes.json()) as { error?: string };
        throw new Error(json.error ?? "Publish failed");
      }
      toast.success("Module published", { id: tid });
      router.push(`/${slug}/module/${id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Publish failed", {
        id: tid,
      });
    }
  }

  function onValidationError(errors: Record<string, unknown>) {
    const first = firstError(errors);
    const all = collectErrorMessages(errors);
    toast.error(all.length ? `${first}\n${all.slice(0, 6).join("\n")}` : first);
  }

  return (
    <Form
      form={form}
      onSubmit={form.handleSubmit(onSubmit, onValidationError)}
      className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_auto_minmax(0,1fr)] gap-16"
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-0.5">
          <h1 className="text-xl font-semibold leading-none text-foreground">
            Create Module
          </h1>
          <p className="text-base leading-none text-muted-foreground">
            Set title, category, make payment
          </p>
        </div>
        <Tabs defaultValue="manual" className="w-full gap-6">
          <TabsList className={"bg-transparent gap-2.5"}>
            <TabsTrigger value="manual" className={"w-[173px]"}>
              Manual
            </TabsTrigger>
            <TabsTrigger value="ai" className={"w-[173px]"}>
              Use AI
            </TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="flex flex-col gap-6">
            <ModuleForm form={form} />
          </TabsContent>
        </Tabs>
      </div>

      <div
        className="hidden lg:block lg:w-px lg:bg-border"
        aria-hidden="true"
      />
      <ModuleReviewPane
        onSave={form.handleSubmit(saveAsDraft, onValidationError)}
        quizBalance={quizBalance}
        quizBalanceLoading={quizBalanceLoading}
      />
    </Form>
  );
}
