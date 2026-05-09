import { Controller, useFormContext } from "react-hook-form";
import { FieldError } from "@/components/ui/field-input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AdvancedOption, Option } from "@/types";
import { Label } from "./ui/label";

type SelectInputProps = {
  name: string;
  label?: string;
  htmlFor?: string;
  options: Option[] | AdvancedOption[] | null;
  placeholder: string;
  transform?: (value: string) => unknown;
  required?: boolean;
};

export default function NativeSelect({
  name,
  label,
  htmlFor,
  placeholder,
  options,
  required,
}: SelectInputProps) {
  const { control } = useFormContext();

  const isAdvancedOptions = (
    data: Option[] | AdvancedOption[] | null,
  ): data is AdvancedOption[] => {
    return Boolean(data?.length && "options" in data[0]);
  };

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        return (
          <div className="flex flex-col gap-1">
            {label && (
              <Label htmlFor={htmlFor} className="relative gap-1">
                {label}
                {required && <span className="text-brand">*</span>}
              </Label>
            )}
            <Select
              name={field.name}
              value={(field.value as string | undefined) ?? ""}
              onValueChange={field.onChange}
              onOpenChange={(open) => {
                if (!open) field.onBlur();
              }}
            >
              <SelectTrigger className="w-full py-[15px] h-[48px] px-2.5 bg-white border-[#E4E4E7]">
                <SelectValue
                  placeholder={
                    (isAdvancedOptions(options)
                      ? options.flatMap((g) => g.options)
                      : (options ?? [])
                    ).find((o) => o.value === field.value)?.label ?? placeholder
                  }
                />
              </SelectTrigger>
              <SelectContent alignItemWithTrigger={false}>
                {isAdvancedOptions(options) ? (
                  options.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.options.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))
                ) : (
                  <SelectGroup>
                    {options?.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            {fieldState.error && <FieldError errors={[fieldState.error]} />}
          </div>
        );
      }}
    />
  );
}
