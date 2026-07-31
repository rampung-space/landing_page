"use client";

import { FileImage } from "lucide-react";

interface FileUploadProps {
  bucket: string;
  path?: string;
  accept?: string;
  maxSize?: number;
  onUpload?: (url: string) => void;
  onError?: (error: string) => void;
  className?: string;
}

function FileUpload({
  bucket,
  path = "",
  accept = "image/*",
  maxSize = 5 * 1024 * 1024,
  className = "",
}: FileUploadProps) {
  void bucket;
  void path;

  return (
    <div className={className}>
      <div
        className={`
          relative border-2 border-dashed rounded-xl p-8
          flex flex-col items-center justify-center gap-3
          border-white/10 bg-white/[0.02] opacity-60 cursor-not-allowed
        `}
        aria-disabled="true"
      >
        <FileImage size={32} className="text-slate-grey" />
        <div className="text-center">
          <p className="text-sm text-slate-grey">Upload disabled</p>
          <p className="text-xs text-slate-grey mt-1">
            Max {Math.round(maxSize / 1024 / 1024)}MB
          </p>
        </div>
        <input
          type="file"
          accept={accept}
          className="hidden"
          disabled
        />
      </div>
    </div>
  );
}

export { FileUpload, type FileUploadProps };
