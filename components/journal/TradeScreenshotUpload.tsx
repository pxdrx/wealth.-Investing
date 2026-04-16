"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ImagePlus, X, Replace, Loader2 } from "lucide-react";
import { uploadTradeScreenshot, deleteTradeScreenshot, getScreenshotUrl } from "@/lib/supabase/screenshot";
import { supabase } from "@/lib/supabase/client";

const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
const ACCEPTED_TYPES = ["image/png", "image/jpeg"];

interface TradeScreenshotUploadProps {
  /** Deferred mode: parent holds the File */
  value?: File | null;
  onChange?: (file: File | null) => void;
  /** Immediate mode: trade already exists */
  tradeId?: string;
  existingPath?: string | null;
  onUploaded?: (path: string) => void;
  onDeleted?: () => void;
  compact?: boolean;
}

function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) {
    return "Formato inválido. Use PNG ou JPG.";
  }
  if (file.size > MAX_SIZE_BYTES) {
    return "Arquivo muito grande. Máximo 5MB.";
  }
  return null;
}

export function TradeScreenshotUpload({
  value,
  onChange,
  tradeId,
  existingPath,
  onUploaded,
  onDeleted,
  compact,
}: TradeScreenshotUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [localPath, setLocalPath] = useState<string | null>(existingPath ?? null);

  const isImmediate = !!tradeId;

  // Generate preview URL for deferred mode (local File)
  useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (!isImmediate) setPreviewUrl(null);
  }, [value, isImmediate]);

  // Generate signed URL for immediate mode (existing path)
  useEffect(() => {
    if (!localPath) {
      if (isImmediate) setPreviewUrl(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const url = await getScreenshotUrl(localPath);
      if (!cancelled) setPreviewUrl(url);
    })();
    return () => { cancelled = true; };
  }, [localPath, isImmediate]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    if (isImmediate && tradeId) {
      // Immediate upload
      setUploading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setError("Sessão expirada.");
          return;
        }

        // Delete old file if replacing
        if (localPath) {
          await deleteTradeScreenshot(session.user.id, tradeId, localPath);
        }

        const path = await uploadTradeScreenshot(session.user.id, tradeId, file);
        setLocalPath(path);
        onUploaded?.(path);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao enviar imagem.");
      } finally {
        setUploading(false);
      }
    } else {
      // Deferred mode
      onChange?.(file);
    }
  }, [isImmediate, tradeId, localPath, onChange, onUploaded]);

  const handleDelete = useCallback(async () => {
    setError(null);
    if (isImmediate && tradeId && localPath) {
      setUploading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.id) {
          setError("Sessão expirada.");
          return;
        }
        await deleteTradeScreenshot(session.user.id, tradeId, localPath);
        setLocalPath(null);
        setPreviewUrl(null);
        onDeleted?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erro ao excluir imagem.");
      } finally {
        setUploading(false);
      }
    } else {
      onChange?.(null);
      setPreviewUrl(null);
    }
  }, [isImmediate, tradeId, localPath, onChange, onDeleted]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items?.length > 0) setIsDragging(true);
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          handleFile(file);
          return;
        }
      }
    }
  }, [handleFile]);

  const hasPreview = !!previewUrl;

  // Global paste listener so Ctrl+V works even without focusing the drop zone
  const handleFileRef = useRef(handleFile);
  handleFileRef.current = handleFile;

  useEffect(() => {
    // Only listen when no preview exists (upload zone is visible)
    if (hasPreview) return;
    const onPaste = (e: ClipboardEvent) => {
      // Scope paste to topmost dialog: if a dialog is open and this
      // component is NOT inside it, skip so the dialog's own upload
      // zone receives the paste instead.
      const dialogs = document.querySelectorAll("[role='dialog']");
      if (dialogs.length > 0 && containerRef.current) {
        const topmostDialog = dialogs[dialogs.length - 1];
        if (!topmostDialog.contains(containerRef.current)) return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            handleFileRef.current(file);
            return;
          }
        }
      }
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, [hasPreview]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }, [handleFile]);

  if (hasPreview) {
    return (
      <div ref={containerRef} className="space-y-1.5">
        <label className="text-sm font-medium text-muted-foreground block">Screenshot</label>
        <div className="relative group rounded-xl overflow-hidden border border-border/40">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Screenshot do trade"
            className="w-full max-h-48 object-cover"
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="rounded-full bg-white/90 p-2 text-foreground hover:bg-white transition-colors"
              title="Trocar imagem"
            >
              <Replace className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={uploading}
              className="rounded-full bg-red-500/90 p-2 text-white hover:bg-red-600 transition-colors"
              title="Excluir imagem"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {uploading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Loader2 className="h-6 w-6 text-white animate-spin" />
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={handleFileInput}
        />
        {error && <p className="text-[11px] text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-1.5">
      <label className="text-sm font-medium text-muted-foreground block">Screenshot</label>
      <div
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onPaste={handlePaste}
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl ${compact ? "py-4 px-3" : "py-6 px-4"} text-center cursor-pointer transition-colors ${
          isDragging
            ? "border-blue-500 bg-blue-500/5"
            : "border-border/60 hover:border-foreground/30"
        } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
      >
        {uploading ? (
          <Loader2 className="mx-auto h-5 w-5 text-muted-foreground animate-spin" />
        ) : (
          <>
            <ImagePlus className="mx-auto h-5 w-5 text-muted-foreground mb-1.5" />
            <p className="text-[11px] text-muted-foreground">
              Arraste, cole (Ctrl+V) ou clique
            </p>
            <p className="text-[9px] text-muted-foreground/60 mt-0.5">
              PNG ou JPG, máx 5MB
            </p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        className="hidden"
        onChange={handleFileInput}
      />
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}
