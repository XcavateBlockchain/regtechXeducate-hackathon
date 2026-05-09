import { Button } from "@/components/ui/button";
import { FieldInput } from "@/components/ui/field-input";
import Form, { useZodForm } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import type { CompanyData } from "@/hooks/use-company";
import { companySchema } from "@/lib/validations/company-schema";

export function CompanyEditForm({ company }: { company: CompanyData | null }) {
  const form = useZodForm({
    schema: companySchema,
    defaultValues: {
      name: company?.name ?? "",
      slug: company?.slug ?? "",
      description: company?.description ?? "",
      logoUrl: company?.logoUrl ?? "",
      website: company?.website ?? "",
      email: company?.owner.email ?? "",
    },
  });

  return (
    <Form form={form}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <FieldInput
          label="Company name"
          {...form.register("name")}
          error={form.formState.errors.name}
        />
        <FieldInput
          label="Tenant slug"
          {...form.register("slug")}
          error={form.formState.errors.slug}
          addOn={
            <span className="text-muted-foreground text-sm">regtech.com</span>
          }
        />
      </div>

      <Textarea {...form.register("description")} />
      <FieldInput
        label="Logo URL"
        {...form.register("logoUrl")}
        error={form.formState.errors.logoUrl}
      />
      <FieldInput
        label="Website"
        {...form.register("website")}
        error={form.formState.errors.website}
      />
      <FieldInput
        label="Owner email"
        {...form.register("email")}
        error={form.formState.errors.email}
      />
      <Button type="submit">Save changes</Button>
    </Form>
  );
}
