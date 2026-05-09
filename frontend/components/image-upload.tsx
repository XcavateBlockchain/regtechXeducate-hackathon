/** biome-ignore-all lint/a11y/useSemanticElements: any */
/** biome-ignore-all lint/a11y/useFocusableInteractive: any */
/** biome-ignore-all lint/a11y/useKeyWithClickEvents: any */
"use client";

import { AlertCircleIcon, ImageIcon, XIcon } from "lucide-react";
import Image from "next/image";
import { useFileUpload } from "@/hooks/use-file-upload";

interface ISingleImageUpload {
  handleFileChange: (file: File[]) => void;
  /** Shown when no new file is selected (e.g. existing draft thumbnail URL). */
  remotePreviewUrl?: string | null;
  /** Called when the user clears the remote-only preview (remove button). */
  onRemoteClear?: () => void;
}

export default function ImageUpload({
  handleFileChange,
  remotePreviewUrl,
  onRemoteClear,
}: ISingleImageUpload) {
  const maxSizeMB = 5;
  const maxSize = maxSizeMB * 1024 * 1024; // 5MB default

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      getInputProps,
    },
  ] = useFileUpload({
    accept: "image/*",
    maxSize,
    onFilesChange: (fileWithPreviews) => {
      // Extract File objects from FileWithPreview array
      const fileArray = fileWithPreviews
        .map((fw) => fw.file)
        .filter((file): file is File => file instanceof File);
      handleFileChange(fileArray);
    },
  });

  const previewUrl = files[0]?.preview || remotePreviewUrl || null;
  const showRemove = Boolean(
    previewUrl && (files[0]?.preview || (remotePreviewUrl && onRemoteClear)),
  );

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        {/* Drop area */}
        <div
          role="button"
          onClick={openFileDialog}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          data-dragging={isDragging || undefined}
          className="relative flex min-h-[195px] flex-col items-center justify-center overflow-hidden rounded-xl border border-dashed border-input p-4 transition-colors hover:bg-accent/50 has-disabled:pointer-events-none has-disabled:opacity-50 has-[img]:border-none has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
        >
          <input
            {...getInputProps()}
            className="sr-only"
            aria-label="Upload file"
          />
          {previewUrl ? (
            <div className="absolute inset-0">
              {/* <img
                src={previewUrl}
                alt={files[0]?.file?.name || "Uploaded image"}
                className="size-full object-cover"
              /> */}
              <Image
                src={previewUrl}
                alt={files[0]?.file?.name || "Module thumbnail"}
                fill={true}
                objectFit="cover"
                unoptimized={
                  previewUrl.startsWith("http://") ||
                  previewUrl.startsWith("https://") ||
                  previewUrl.startsWith("blob:")
                }
                // className="cursor-pointer rounded-lg transition group-hover:brightness-50"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-4 py-3 text-center">
              <div
                className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
                aria-hidden="true"
              >
                <ImageIcon className="size-4 opacity-60" />
              </div>
              <p className="mb-1.5 text-sm text-[#71717A] font-medium">
                Drop your thumbnail image here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Max size: {maxSizeMB}MB
              </p>
            </div>
          )}
        </div>
        {showRemove && (
          <div className="absolute top-4 right-4">
            <button
              type="button"
              className="z-50 flex size-8 cursor-pointer items-center justify-center rounded-full bg-black/60 text-white transition-[color,box-shadow] outline-none hover:bg-black/80 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
              onClick={(e) => {
                e.stopPropagation();
                if (files[0]?.id) {
                  removeFile(files[0].id);
                } else if (remotePreviewUrl && onRemoteClear) {
                  onRemoteClear();
                }
              }}
              aria-label="Remove image"
            >
              <XIcon className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {errors.length > 0 && (
        <div
          className="flex items-center gap-1 text-xs text-destructive"
          role="alert"
        >
          <AlertCircleIcon className="size-3 shrink-0" />
          <span>{errors[0]}</span>
        </div>
      )}
    </div>
  );
}
