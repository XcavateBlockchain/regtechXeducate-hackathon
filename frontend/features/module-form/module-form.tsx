import type { UseFormReturn } from "react-hook-form";
import { useWatch } from "react-hook-form";
import FileUpload from "@/components/file-upload";
import ImageUpload from "@/components/image-upload";
import NativeSelect from "@/components/native-select";
import { FieldError, FieldInput } from "@/components/ui/field-input";
import { Textarea } from "@/components/ui/textarea";
import {
  CATEGORY_OPTIONS,
  LANGUAGE_OPTIONS,
  MODULE_TYPE_OPTIONS,
  type ModuleWithQuizInput,
  TIME_OPTIONS,
} from "@/lib/validations/module-schema";

interface IForm {
  form: UseFormReturn<ModuleWithQuizInput>;
}

export default function ModuleForm({ form }: IForm) {
  const existingThumbnailUrl = useWatch({
    control: form.control,
    name: "existingThumbnailUrl",
  });

  return (
    <>
      <FieldInput
        label="Name"
        placeholder="Module Name"
        maxLength={80}
        {...form.register("title")}
        error={form.formState.errors.title}
      />

      <div>
        <Textarea
          placeholder="Module Description"
          {...form.register("description")}
        />
        {form.formState.errors.description && (
          <FieldError errors={[form.formState.errors.description]} />
        )}
      </div>
      <NativeSelect
        name="moduleType"
        label="Module Type"
        options={MODULE_TYPE_OPTIONS}
        placeholder="Select Module Type"
        required
      />
      <NativeSelect
        name="category"
        label="Category"
        options={CATEGORY_OPTIONS}
        placeholder="Select Category"
        required
      />
      <div className="grid-cols-1 gap-x-2.5 gap-y-6 md:grid-cols-2 grid">
        <NativeSelect
          name="completionTime"
          label="Est completion time"
          options={TIME_OPTIONS}
          placeholder="Select Est completion time"
          required
        />
        <NativeSelect
          name="language"
          label="Language"
          options={LANGUAGE_OPTIONS}
          placeholder="Select Language"
          required
        />
        <FieldInput
          type="number"
          inputMode="numeric"
          max={100}
          label="Passing score"
          placeholder="Passing score"
          {...form.register("passingScore")}
          error={form.formState.errors.passingScore}
          tooltip="Passing score"
          tooltipDescription="Passing score is the minimum score required to pass the module."
          required
        />
        <FieldInput
          type="number"
          inputMode="numeric"
          label="Number of recipients"
          placeholder="Recipients"
          {...form.register("recipients")}
          error={form.formState.errors.recipients}
          tooltip="Number of recipients"
          tooltipDescription="Number of recipients is how many certificates you want to sponsor."
          required
        />
        <FieldInput
          type="number"
          inputMode="numeric"
          min={0}
          max={180}
          label="Quiz time limit (min)"
          placeholder="0 = unlimited"
          {...form.register("quizTimeLimitMinutes")}
          error={form.formState.errors.quizTimeLimitMinutes}
          tooltip="Quiz time limit"
          tooltipDescription="Per-attempt countdown in minutes. 0 or empty means no limit."
        />
        <FieldInput
          type="number"
          inputMode="numeric"
          min={0}
          label="Cooldown (hrs)"
          placeholder="Hours between attempts"
          {...form.register("cooldownHours")}
          error={form.formState.errors.cooldownHours}
          tooltip="Retry cooldown"
          tooltipDescription="Minimum wait between attempts, in hours. 0 = allow immediate retries. Locked after publish."
          required
        />
        <FieldInput
          type="number"
          inputMode="numeric"
          min={0}
          max={120}
          label="Credential expiry (months)"
          placeholder="Leave blank for never"
          {...form.register("credentialExpiryMonths")}
          error={form.formState.errors.credentialExpiryMonths}
          tooltip="Credential expiry"
          tooltipDescription="How long the issued credential stays valid, in months. Leave blank or 0 for permanent. Locked after publish."
        />
      </div>
      <div className="grid grid-cols-1 gap-x-2.5 md:grid-cols-2">
        <div className="flex flex-col gap-1">
          {form.formState.errors.thumbnailImage && (
            <FieldError errors={[form.formState.errors.thumbnailImage]} />
          )}
          <ImageUpload
            remotePreviewUrl={existingThumbnailUrl || undefined}
            onRemoteClear={() => {
              form.setValue("existingThumbnailUrl", undefined, {
                shouldValidate: true,
              });
              form.setValue("thumbnailImage", undefined, {
                shouldValidate: true,
              });
            }}
            handleFileChange={(files) => {
              const f = files[0];
              if (f) {
                form.setValue("thumbnailImage", f, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
                form.setValue("existingThumbnailUrl", undefined, {
                  shouldValidate: true,
                });
              } else {
                form.setValue("thumbnailImage", undefined, {
                  shouldValidate: true,
                  shouldDirty: true,
                });
              }
            }}
          />
        </div>
        <div className="flex flex-col gap-1">
          {form.formState.errors.contents && (
            <FieldError errors={[form.formState.errors.contents]} />
          )}
          <FileUpload
            handleFileChange={(files) => {
              form.setValue("contents", files, {
                shouldValidate: true,
                shouldDirty: true,
              });
            }}
          />
        </div>
      </div>
    </>
  );
}
