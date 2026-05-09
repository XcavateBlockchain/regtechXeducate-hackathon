/** biome-ignore-all lint/a11y/noStaticElementInteractions: drop zone needs custom drag/click handling */
/** biome-ignore-all lint/a11y/noNoninteractiveTabindex: drop zone must remain keyboard accessible */
"use client";

import {
  AlertCircleIcon,
  FileArchiveIcon,
  FileIcon,
  FileSpreadsheetIcon,
  FileTextIcon,
  HeadphonesIcon,
  ImageIcon,
  Trash2Icon,
  UploadIcon,
  VideoIcon,
  XIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatBytes, useFileUpload } from "@/hooks/use-file-upload";

const getFileIcon = (file: { file: File | { type: string; name: string } }) => {
  const fileType = file.file instanceof File ? file.file.type : file.file.type;
  const fileName = file.file instanceof File ? file.file.name : file.file.name;

  if (
    fileType.includes("pdf") ||
    fileName.endsWith(".pdf") ||
    fileType.includes("word") ||
    fileName.endsWith(".doc") ||
    fileName.endsWith(".docx")
  ) {
    return <FileTextIcon className="size-4 opacity-60" />;
  } else if (
    fileType.includes("zip") ||
    fileType.includes("archive") ||
    fileName.endsWith(".zip") ||
    fileName.endsWith(".rar")
  ) {
    return <FileArchiveIcon className="size-4 opacity-60" />;
  } else if (
    fileType.includes("excel") ||
    fileName.endsWith(".xls") ||
    fileName.endsWith(".xlsx")
  ) {
    return <FileSpreadsheetIcon className="size-4 opacity-60" />;
  } else if (fileType.includes("video/")) {
    return <VideoIcon className="size-4 opacity-60" />;
  } else if (fileType.includes("audio/")) {
    return <HeadphonesIcon className="size-4 opacity-60" />;
  } else if (fileType.startsWith("image/")) {
    return <ImageIcon className="size-4 opacity-60" />;
  }
  return <FileIcon className="size-4 opacity-60" />;
};

export default function FileUpload({
  handleFileChange,
}: {
  handleFileChange: (files: File[]) => void;
}) {
  const maxSize = 10 * 1024 * 1024; // 10MB default
  const maxFiles = 10;

  const [
    { files, isDragging, errors },
    {
      handleDragEnter,
      handleDragLeave,
      handleDragOver,
      handleDrop,
      openFileDialog,
      removeFile,
      clearFiles,
      getInputProps,
    },
  ] = useFileUpload({
    multiple: true,
    maxFiles,
    maxSize,

    onFilesChange: (fileWithPreviews) => {
      // Extract File objects from FileWithPreview array
      const fileArray = fileWithPreviews
        .map((fw) => fw.file)
        .filter((file): file is File => file instanceof File);
      handleFileChange(fileArray);
    },
  });

  return (
    <div className="flex flex-col gap-2">
      {/* Drop area */}
      <div
        className="flex min-h-[195px] flex-col items-center rounded-xl border border-dashed border-input p-4 transition-colors not-data-files:justify-center has-[input:focus]:border-ring has-[input:focus]:ring-[3px] has-[input:focus]:ring-ring/50 data-[dragging=true]:bg-accent/50"
        data-dragging={isDragging || undefined}
        data-files={files.length > 0 || undefined}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <input
          {...getInputProps()}
          className="sr-only"
          aria-label="multiple file upload"
        />

        {files.length > 0 ? (
          <div className="flex w-full flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="truncate text-sm font-medium">
                Uploaded Files ({files.length})
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearFiles}
              >
                <Trash2Icon
                  className="-ms-0.5 size-3.5 opacity-60"
                  aria-hidden="true"
                />
                Remove all
              </Button>
            </div>
            <div className="w-full space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-2 rounded-lg border bg-background p-2 pe-3"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex aspect-square size-10 shrink-0 items-center justify-center rounded border">
                      {getFileIcon(file)}
                    </div>
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="truncate text-[13px] font-medium">
                        {file.file instanceof File
                          ? file.file.name
                          : file.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(
                          file.file instanceof File
                            ? file.file.size
                            : file.file.size,
                        )}
                      </p>
                    </div>
                  </div>

                  <Button
                    size="icon"
                    variant="ghost"
                    className="-me-2 size-8 text-muted-foreground/80 hover:bg-transparent hover:text-foreground"
                    onClick={() => removeFile(file.id)}
                    aria-label="Remove file"
                    type="button"
                  >
                    <XIcon className="size-4" aria-hidden="true" />
                  </Button>
                </div>
              ))}

              {files.length < maxFiles && (
                <Button
                  type="button"
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={openFileDialog}
                >
                  <UploadIcon className="-ms-1 opacity-60" aria-hidden="true" />
                  Add more
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center">
            <div
              className="mb-2 flex size-11 shrink-0 items-center justify-center rounded-full border bg-background"
              aria-hidden="true"
            >
              <FileIcon className="size-4 opacity-60" />
            </div>
            <p className="mb-1.5 text-sm font-medium text-[#71717A]">
              Upload files
            </p>
            <p className="text-xs text-muted-foreground">
              Max {maxFiles} files ∙ Up to {maxSize}MB
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 rounded-full font-normal"
              onClick={openFileDialog}
            >
              <UploadIcon className="-ms-1 opacity-60" aria-hidden="true" />
              Select files
            </Button>
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
