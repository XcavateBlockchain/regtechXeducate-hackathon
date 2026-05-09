/** biome-ignore-all lint/suspicious/noExplicitAny: any */
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import type { ComponentProps } from "react";

import {
  type FieldValues,
  FormProvider,
  type UseFormProps,
  type UseFormReturn,
  useForm,
} from "react-hook-form";

import type { z } from "zod";
import { cn } from "@/lib/utils";

// interface UseZodFormProps<T extends z.ZodType<any, any, any>>
//   extends UseFormProps<z.input<T>, any, z.output<T>> {
//   schema: T;
// }

// export const useZodForm = <T extends z.ZodType<any, any, any>>({
//   schema,
//   ...formConfig
// }: UseZodFormProps<T>) => {
//   return useForm<z.input<T>, any, z.output<T>>({
//     ...formConfig,
//     resolver: zodResolver(schema),
//   });
// };

interface UseZodFormProps<T extends z.ZodType<any, any>>
  extends Omit<UseFormProps<z.input<T>, any, z.output<T>>, "resolver"> {
  schema: T;
}

export const useZodForm = <T extends z.ZodType<any, any>>({
  schema,
  ...formConfig
}: UseZodFormProps<T>) => {
  return useForm<z.input<T>, any, z.output<T>>({
    ...formConfig,
    resolver: zodResolver(schema),
  });
};

interface FormProps<T extends FieldValues> extends ComponentProps<"form"> {
  form: UseFormReturn<T>;
  disabled?: boolean;
}

const Form = <T extends FieldValues>({
  form,
  className,
  disabled,
  children,
  ...props
}: FormProps<T>) => {
  return (
    <FormProvider {...form}>
      <form {...props}>
        <fieldset
          className={cn("grid w-full gap-6", className)}
          disabled={form.formState.isSubmitting || disabled}
        >
          {children}
        </fieldset>
      </form>
    </FormProvider>
  );
};

export default Form;
