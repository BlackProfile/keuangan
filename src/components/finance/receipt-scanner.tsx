"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  ScanLine,
  ImagePlus,
  X,
  Loader2,
  Trash2,
  Check,
  Camera,
  AlertCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useReceiptScan, useCategories } from "@/lib/hooks";

export interface ReceiptResult {
  merchant?: string;
  date?: string;
  total?: number;
  items?: string[];
  category?: string;
  error?: string;
}

export interface ScannedReceiptData {
  merchant?: string;
  date?: string;
  total?: number;
  items?: string[];
  category?: string;
  photoUrl?: string; // base64 image
  categoryId?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called when user confirms the scanned data — parent fills the form */
  onScan: (data: ScannedReceiptData) => void;
  /** Optional: hide the "Terapkan ke Form" button (auto-apply on success) */
  autoApply?: boolean;
}

/**
 * Reusable receipt scanner dialog.
 * Upload/drag/capture photo → AI extracts merchant/date/total/items/category →
 * parent form auto-fills via onScan callback.
 */
export function ReceiptScanner({
  open,
  onOpenChange,
  onScan,
  autoApply = false,
}: Props) {
  const [preview, setPreview] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<ReceiptResult | null>(null);
  const [applied, setApplied] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = React.useState(false);

  const scanMut = useReceiptScan();
  const { data: categories } = useCategories();

  // Reset state when dialog closes
  React.useEffect(() => {
    if (!open) {
      // Small delay so user sees the apply success before reset
      const t = setTimeout(() => {
        setPreview(null);
        setResult(null);
        setApplied(false);
        if (inputRef.current) inputRef.current.value = "";
      }, 300);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handleFile(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("Ukuran gambar maksimal 8MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPreview(dataUrl);
      setResult(null);
      setApplied(false);
      // Auto-scan on file selected
      scanMut.mutate(dataUrl, {
        onSuccess: (data) => {
          const r = data as ReceiptResult;
          setResult(r);
          if (r.error) {
            toast.warning("Hasil pindai mungkin tidak akurat. Periksa kembali.");
          } else {
            toast.success("Struk berhasil dipindai!");
            if (autoApply) {
              applyResult(r, dataUrl);
            }
          }
        },
        onError: (err) => {
          toast.error(err.message || "Gagal memindai struk.");
        },
      });
    };
    reader.onerror = () => toast.error("Gagal membaca file gambar.");
    reader.readAsDataURL(file);
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  function handleDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function rescan() {
    if (!preview) return;
    scanMut.mutate(preview, {
      onSuccess: (data) => {
        const r = data as ReceiptResult;
        setResult(r);
        if (r.error) {
          toast.warning("Hasil pindai mungkin tidak akurat.");
        } else {
          toast.success("Struk berhasil dipindai!");
        }
      },
      onError: (err) => toast.error(err.message || "Gagal memindai."),
    });
  }

  function applyResult(r: ReceiptResult, imageDataUrl?: string) {
    const categoryName = r.category || "Lainnya";
    const cat = (categories ?? []).find(
      (c) =>
        c.type === "EXPENSE" &&
        c.name.toLowerCase() === categoryName.toLowerCase(),
    );
    const fallbackCat = (categories ?? []).find((c) => c.type === "EXPENSE");
    const categoryId = cat?.id ?? fallbackCat?.id ?? "";
    onScan({
      merchant: r.merchant,
      date: r.date,
      total: r.total,
      items: r.items,
      category: r.category,
      categoryId,
      photoUrl: imageDataUrl ?? preview ?? undefined,
    });
    setApplied(true);
    toast.success("Data struk diterapkan ke form.");
    setTimeout(() => onOpenChange(false), 600);
  }

  function handleReset() {
    setPreview(null);
    setResult(null);
    setApplied(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  // Camera capture via getUserMedia (simplified — opens file input with capture attr)
  function handleCamera() {
    if (inputRef.current) {
      inputRef.current.setAttribute("capture", "environment");
      inputRef.current?.click();
      setTimeout(() => {
        inputRef.current?.removeAttribute("capture");
      }, 500);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-lg gap-0 overflow-hidden p-0 sm:rounded-2xl"
      >
        <DialogHeader className="space-y-0 border-b border-border bg-muted/30 p-5 pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <ScanLine className="h-5 w-5" />
              </span>
              <div>
                <DialogTitle className="text-base">Pindai Struk</DialogTitle>
                <DialogDescription className="text-xs">
                  Unggah foto struk, AI akan mengekstrak data otomatis.
                </DialogDescription>
              </div>
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                aria-label="Tutup"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto custom-scrollbar p-5">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
          />

          {/* Upload / preview area */}
          {!preview ? (
            <div className="space-y-3">
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                className={cn(
                  "flex w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-12 transition-colors",
                  dragOver
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/30",
                )}
              >
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <ImagePlus className="h-6 w-6" />
                </span>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Klik atau seret gambar ke sini
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Format JPG, PNG, WebP · maks 8MB
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] text-muted-foreground">atau</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={handleCamera}
                className="w-full gap-2"
              >
                <Camera className="h-4 w-4" />
                Ambil Foto dengan Kamera
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/30">
                <img
                  src={preview}
                  alt="Pratinjau struk"
                  className="mx-auto max-h-72 object-contain"
                />
                <button
                  type="button"
                  onClick={handleReset}
                  className="absolute right-2 top-2 rounded-full bg-background/80 p-1.5 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-destructive hover:text-destructive-foreground"
                  aria-label="Hapus gambar"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={rescan}
                  disabled={scanMut.isPending}
                  variant="outline"
                  className="gap-1.5"
                >
                  {scanMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ScanLine className="h-4 w-4" />
                  )}
                  {scanMut.isPending ? "Memindai..." : "Pindai Ulang"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  className="gap-1.5"
                  disabled={scanMut.isPending}
                >
                  <Trash2 className="h-4 w-4" />
                  Ganti Gambar
                </Button>
              </div>
            </div>
          )}

          {/* Loading skeleton */}
          {scanMut.isPending && !result && (
            <Card className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">Memindai struk...</span>
                </div>
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-6 w-2/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </div>
            </Card>
          )}

          {/* Result */}
          {result && (
            <Card className="p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <h4 className="text-sm font-semibold">Hasil Pindai</h4>
                </div>
                {result.error && (
                  <Badge variant="outline" className="gap-1 text-amber-600">
                    <AlertCircle className="h-3 w-3" />
                    Periksa ulang
                  </Badge>
                )}
              </div>
              <div className="space-y-2 text-sm">
                <ResultRow label="Merchant" value={result.merchant} />
                <ResultRow label="Tanggal" value={result.date} />
                <ResultRow
                  label="Total"
                  value={
                    result.total
                      ? new Intl.NumberFormat("id-ID", {
                          style: "currency",
                          currency: "IDR",
                          maximumFractionDigits: 0,
                        }).format(result.total)
                      : undefined
                  }
                  strong
                />
                <ResultRow label="Kategori" value={result.category} />
                {result.items && result.items.length > 0 && (
                  <div className="space-y-1 pt-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Item ({result.items.length})
                    </p>
                    <ul className="space-y-1 rounded-lg bg-muted/50 p-2.5">
                      {result.items.map((it, i) => (
                        <li
                          key={i}
                          className="text-xs text-foreground"
                        >
                          · {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              {!autoApply && (
                <Button
                  type="button"
                  onClick={() => applyResult(result)}
                  className="mt-4 w-full gap-2"
                  disabled={applied}
                >
                  {applied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Diterapkan
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Terapkan ke Form
                    </>
                  )}
                </Button>
              )}
            </Card>
          )}

          {/* Applied success state */}
          {applied && (
            <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 py-4 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">
                Data struk diterapkan ke form
              </span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ResultRow({
  label,
  value,
  strong,
}: {
  label: string;
  value?: string;
  strong?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span
        className={cn(
          "text-right",
          strong ? "font-semibold text-foreground" : "text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}
