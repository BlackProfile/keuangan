"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  AlertCircle,
  ArrowDownToLine,
  Check,
  Database,
  Eye,
  FileJson,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Hash,
  Layers,
  LayoutTemplate,
  Loader2,
  Palette,
  Receipt,
  RefreshCw,
  Save,
  Sparkles,
  Store,
  Table,
  Tag as TagIcon,
  Trash2,
  Users,
  Wand2,
  Wallet,
  X,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table as UiTable,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import {
  formatCurrency,
  formatCurrencyCompact,
  formatDate,
  formatDateLong,
} from "@/lib/format";
import {
  useAccounts,
  useCategories,
  useCreateExportTemplate,
  useDeleteExportTemplate,
  useExportPreview,
  useExportTemplates,
  useGroups,
  useTags,
} from "@/lib/hooks";
import type {
  ExportOptions,
  ExportReportType,
  ExportScope,
  ExportTemplate,
  Transaction,
} from "@/lib/types";
import {
  PDF_TEMPLATES,
  PDF_TEMPLATE_CATEGORIES,
  type PdfTemplateId,
} from "@/lib/pdf-templates";

// ====================== Constants ======================
type ExportFormat = "PDF" | "EXCEL" | "CSV" | "JSON";

const FORMATS: Array<{
  id: ExportFormat;
  label: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
}> = [
  {
    id: "PDF",
    label: "PDF",
    desc: "Dokumen cetak",
    icon: <FileText className="h-5 w-5" />,
    accent: "text-rose-600 dark:text-rose-400",
  },
  {
    id: "EXCEL",
    label: "Excel",
    desc: "Spreadsheet",
    icon: <FileSpreadsheet className="h-5 w-5" />,
    accent: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: "CSV",
    label: "CSV",
    desc: "Data terbuka",
    icon: <Table className="h-5 w-5" />,
    accent: "text-teal-600 dark:text-teal-400",
  },
  {
    id: "JSON",
    label: "JSON",
    desc: "Backup penuh",
    icon: <FileJson className="h-5 w-5" />,
    accent: "text-amber-600 dark:text-amber-400",
  },
];

const REPORT_TYPES: Array<{ id: ExportReportType; label: string }> = [
  { id: "TRANSACTIONS", label: "Daftar Transaksi" },
  { id: "MONTHLY", label: "Ringkasan Bulanan" },
  { id: "YEARLY", label: "Ringkasan Tahunan" },
  { id: "TAX", label: "Laporan Pajak" },
  { id: "BUDGET", label: "Anggaran" },
  { id: "GOALS", label: "Tujuan Keuangan" },
  { id: "DEBTS", label: "Utang & Piutang" },
  { id: "ACCOUNT", label: "Per Akun" },
  { id: "GROUP", label: "Per Grup" },
  { id: "CASHFLOW", label: "Arus Kas" },
  { id: "NETWORTH", label: "Kekayaan Bersih" },
  { id: "SLIP", label: "Slip Gaji" },
];

const SCOPE_TYPES: Array<{
  id: ExportScope["type"];
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "ALL", label: "Semua", icon: <Database className="h-3.5 w-3.5" /> },
  { id: "ACCOUNT", label: "Akun", icon: <Wallet className="h-3.5 w-3.5" /> },
  { id: "CATEGORY", label: "Kategori", icon: <Layers className="h-3.5 w-3.5" /> },
  { id: "GROUP", label: "Grup", icon: <Sparkles className="h-3.5 w-3.5" /> },
  { id: "TAG", label: "Tag", icon: <TagIcon className="h-3.5 w-3.5" /> },
  { id: "DATE_RANGE", label: "Rentang", icon: <Receipt className="h-3.5 w-3.5" /> },
  { id: "CUSTOM", label: "Custom", icon: <Hash className="h-3.5 w-3.5" /> },
];

const FIELD_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "date", label: "Tanggal" },
  { id: "type", label: "Tipe" },
  { id: "amount", label: "Jumlah" },
  { id: "description", label: "Keterangan" },
  { id: "category", label: "Kategori" },
  { id: "account", label: "Akun" },
  { id: "merchant", label: "Merchant" },
  { id: "note", label: "Catatan" },
  { id: "tags", label: "Tag" },
  { id: "mood", label: "Suasana" },
  { id: "priority", label: "Prioritas" },
  { id: "paymentMethod", label: "Metode Bayar" },
];

const DEFAULT_FIELDS = [
  "date",
  "type",
  "amount",
  "description",
  "category",
  "account",
  "merchant",
  "note",
  "tags",
  "mood",
  "priority",
  "paymentMethod",
];

const GROUP_BY_OPTIONS: Array<{
  id: NonNullable<ExportOptions["groupBy"]> | "none";
  label: string;
}> = [
  { id: "none", label: "Tidak dikelompokkan" },
  { id: "date", label: "Tanggal" },
  { id: "category", label: "Kategori" },
  { id: "account", label: "Akun" },
  { id: "merchant", label: "Merchant" },
];

const FORMAT_LABEL: Record<ExportFormat, string> = {
  PDF: "PDF",
  EXCEL: "Excel",
  CSV: "CSV",
  JSON: "JSON",
};

// ====================== PDF Template Picker ======================
type PdfCategoryFilter = "all" | "style" | "report" | "audience" | "student";

const PDF_CATEGORY_TABS: Array<{
  id: PdfCategoryFilter;
  label: string;
  icon: React.ReactNode;
}> = [
  { id: "all", label: "Semua", icon: <LayoutTemplate className="h-3 w-3" /> },
  { id: "style", label: "Gaya Tampilan", icon: <Palette className="h-3 w-3" /> },
  { id: "report", label: "Tipe Laporan", icon: <FileText className="h-3 w-3" /> },
  { id: "audience", label: "Untuk Siapa", icon: <Users className="h-3 w-3" /> },
  { id: "student", label: "Mahasiswa", icon: <GraduationCap className="h-3 w-3" /> },
];

const pdfCategoryLabel = (cat: PdfCategoryFilter): string =>
  cat === "all"
    ? "Semua"
    : PDF_TEMPLATE_CATEGORIES.find((c) => c.id === cat)?.label ?? cat;

// ====================== Section ======================
export function ExportSection() {
  // ---- Config state ----
  const [format, setFormat] = React.useState<ExportFormat>("PDF");
  const [reportType, setReportType] =
    React.useState<ExportReportType>("TRANSACTIONS");
  const [scopeType, setScopeType] = React.useState<ExportScope["type"]>("ALL");
  const [accountId, setAccountId] = React.useState("");
  const [categoryId, setCategoryId] = React.useState("");
  const [groupId, setGroupId] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [fields, setFields] = React.useState<string[]>(DEFAULT_FIELDS);
  const [includeHidden, setIncludeHidden] = React.useState(false);

  // ---- PDF template picker (visible only when format === "PDF") ----
  const [pdfTemplateId, setPdfTemplateId] =
    React.useState<PdfTemplateId>("minimal-clean");
  const [pdfCategory, setPdfCategory] =
    React.useState<PdfCategoryFilter>("all");
  const [watermark, setWatermark] = React.useState("");
  const [title, setTitle] = React.useState("Laporan Keuangan");
  const [groupBy, setGroupBy] = React.useState<
    NonNullable<ExportOptions["groupBy"]> | "none"
  >("none");
  const [showSummary, setShowSummary] = React.useState(true);
  const [showCharts, setShowCharts] = React.useState(false);

  // ---- Save-template dialog ----
  const [saveOpen, setSaveOpen] = React.useState(false);
  const [templateName, setTemplateName] = React.useState("");

  // ---- Downloading state (which format) ----
  // Lowercase keys to match the URL record + extension logic.
  type DownloadFormat = "pdf" | "excel" | "csv" | "json";
  const [downloading, setDownloading] = React.useState<
    DownloadFormat | "ALL" | null
  >(null);

  // ---- Reference data ----
  const { data: accounts } = useAccounts();
  const { data: categories } = useCategories();
  const { data: groups } = useGroups();
  const { data: tags } = useTags();

  // ---- Templates ----
  const { data: templates, isLoading: templatesLoading } = useExportTemplates();
  const createTplMut = useCreateExportTemplate();
  const deleteTplMut = useDeleteExportTemplate();

  // ---- Computed scope/options payload ----
  const scope: ExportScope = React.useMemo(() => {
    const base: ExportScope = { type: scopeType, includeHidden };
    switch (scopeType) {
      case "ACCOUNT":
        return { ...base, accountId: accountId || undefined };
      case "CATEGORY":
        return { ...base, categoryId: categoryId || undefined };
      case "GROUP":
        return { ...base, groupId: groupId || undefined };
      case "TAG":
        return { ...base, tag: tag || undefined };
      case "DATE_RANGE":
        return { ...base, from: from || undefined, to: to || undefined };
      case "CUSTOM":
        return { ...base, txIds: [] };
      default:
        return base;
    }
  }, [scopeType, accountId, categoryId, groupId, tag, from, to, includeHidden]);

  const options: ExportOptions = React.useMemo(
    () => ({
      includeHidden,
      watermark: watermark.trim() || undefined,
      title: title.trim() || "Laporan Keuangan",
      groupBy: groupBy === "none" ? undefined : groupBy,
      showSummary,
      showCharts,
      language: "id",
      numberFormat: "id",
    }),
    [
      includeHidden,
      watermark,
      title,
      groupBy,
      showSummary,
      showCharts,
    ]
  );

  // ---- Live preview (debounced) ----
  const previewMut = useExportPreview();

  // ---- PDF template picker (computed) ----
  const filteredPdfTemplates = React.useMemo(
    () =>
      pdfCategory === "all"
        ? PDF_TEMPLATES
        : PDF_TEMPLATES.filter((t) => t.category === pdfCategory),
    [pdfCategory]
  );
  const selectedPdfTemplate = React.useMemo(
    () => PDF_TEMPLATES.find((t) => t.id === pdfTemplateId),
    [pdfTemplateId]
  );

  React.useEffect(() => {
    const handle = window.setTimeout(() => {
      previewMut.mutate({
        scope: scope as unknown as Record<string, unknown>,
        fields,
        options: {
          ...options,
          templateId: pdfTemplateId,
        } as unknown as Record<string, unknown>,
      });
    }, 500);
    return () => window.clearTimeout(handle);
  }, [scope, fields, options, pdfTemplateId]);

  const preview = previewMut.data;
  const previewLoading = previewMut.isPending;
  const previewError = previewMut.isError;

  // ====================== Actions ======================
  function toggleField(id: string) {
    setFields((prev) =>
      prev.includes(id) ? prev.filter((f) => f !== id) : [...prev, id]
    );
  }

  function applyTemplate(t: ExportTemplate) {
    if (t.format !== "IMAGE") setFormat(t.format as ExportFormat);
    setReportType(t.reportType);
    if (t.scope) {
      setScopeType(t.scope.type);
      setAccountId(t.scope.accountId ?? "");
      setCategoryId(t.scope.categoryId ?? "");
      setGroupId(t.scope.groupId ?? "");
      setTag(t.scope.tag ?? "");
      setFrom(t.scope.from ?? "");
      setTo(t.scope.to ?? "");
      if (typeof t.scope.includeHidden === "boolean") {
        setIncludeHidden(t.scope.includeHidden);
      }
    }
    if (t.fields && t.fields.length > 0) setFields(t.fields);
    if (t.options) {
      if (typeof t.options.includeHidden === "boolean")
        setIncludeHidden(t.options.includeHidden);
      if (typeof t.options.watermark === "string")
        setWatermark(t.options.watermark);
      if (typeof t.options.title === "string") setTitle(t.options.title);
      if (t.options.groupBy) setGroupBy(t.options.groupBy);
      if (typeof t.options.showSummary === "boolean")
        setShowSummary(t.options.showSummary);
      if (typeof t.options.showCharts === "boolean")
        setShowCharts(t.options.showCharts);
    }
    toast.success(`Template "${t.name}" diterapkan.`);
  }

  function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    const name = templateName.trim();
    if (!name) {
      toast.error("Nama template tidak boleh kosong.");
      return;
    }
    createTplMut.mutate(
      {
        name,
        format,
        reportType,
        scope,
        fields,
        options,
      },
      {
        onSuccess: () => {
          toast.success(`Template "${name}" disimpan.`);
          setTemplateName("");
          setSaveOpen(false);
        },
        onError: (err) =>
          toast.error(err.message || "Gagal menyimpan template."),
      }
    );
  }

  function handleDeleteTemplate(id: string, name: string) {
    deleteTplMut.mutate(id, {
      onSuccess: () => toast.success(`Template "${name}" dihapus.`),
      onError: (err) =>
        toast.error(err.message || "Gagal menghapus template."),
    });
  }

  async function downloadExport(fmt: DownloadFormat) {
    const url: Record<DownloadFormat, string> = {
      pdf: api.exportPdfUrl(),
      excel: api.exportExcelUrl(),
      csv: api.exportCsvUrl(),
      json: api.exportJsonUrl(),
    };
    try {
      setDownloading(fmt);
      const res = await fetch(url[fmt], {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope,
          fields,
          options: { ...options, templateId: pdfTemplateId },
        }),
      });
      if (!res.ok) throw new Error("Export gagal");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `dompetku-export-${new Date()
        .toISOString()
        .split("T")[0]}.${fmt === "excel" ? "xlsx" : fmt}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
      toast.success(`Export ${fmt.toUpperCase()} berhasil`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export gagal";
      toast.error(msg);
    } finally {
      setDownloading(null);
    }
  }

  async function downloadAllFormats() {
    try {
      setDownloading("ALL");
      const sequence: DownloadFormat[] = ["pdf", "excel", "csv", "json"];
      for (const fmt of sequence) {
        await downloadExportSilent(fmt);
      }
      toast.success("Semua format berhasil diunduh.");
    } catch {
      toast.error("Sebagian format gagal diunduh.");
    } finally {
      setDownloading(null);
    }
  }

  async function downloadExportSilent(fmt: DownloadFormat) {
    const url: Record<DownloadFormat, string> = {
      pdf: api.exportPdfUrl(),
      excel: api.exportExcelUrl(),
      csv: api.exportCsvUrl(),
      json: api.exportJsonUrl(),
    };
    const res = await fetch(url[fmt], {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, fields, options }),
    });
    if (!res.ok) throw new Error("Export gagal");
    const blob = await res.blob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `dompetku-export-${new Date()
      .toISOString()
      .split("T")[0]}.${fmt === "excel" ? "xlsx" : fmt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(a.href);
  }

  // ====================== Render ======================
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Export Data</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Export laporan keuangan ke PDF, Excel, CSV, JSON.
          </p>
        </div>
        <Button
          variant="outline"
          className="gap-1.5"
          onClick={() => setSaveOpen(true)}
        >
          <Save className="h-4 w-4" />
          Simpan Template
        </Button>
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* ===== Left: Config Panel ===== */}
        <div className="lg:col-span-5">
          <div className="lg:sticky lg:top-4 space-y-4">
            <Card className="p-5">
              {/* 1. Pilih Format */}
              <SectionTitle step={1} label="Pilih Format" />
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {FORMATS.map((f) => (
                  <FormatCard
                    key={f.id}
                    label={f.label}
                    desc={f.desc}
                    icon={f.icon}
                    accent={f.accent}
                    selected={format === f.id}
                    onClick={() => setFormat(f.id)}
                  />
                ))}
              </div>

              {/* Template PDF — only visible when format === "PDF" */}
              {format === "PDF" && (
                <div className="mt-5">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                      <LayoutTemplate className="h-3 w-3" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold text-foreground">
                        Template PDF
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Pilih gaya template untuk PDF Anda
                      </p>
                    </div>
                  </div>

                  {/* Category filter */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {PDF_CATEGORY_TABS.map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setPdfCategory(tab.id)}
                        aria-pressed={pdfCategory === tab.id}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                          pdfCategory === tab.id
                            ? "border-emerald-500 bg-emerald-600 text-white"
                            : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        {tab.icon}
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* Template grid */}
                  <div className="custom-scrollbar mt-3 max-h-96 overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {filteredPdfTemplates.map((t) => {
                        const selected = pdfTemplateId === t.id;
                        return (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => setPdfTemplateId(t.id)}
                            aria-pressed={selected}
                            title={t.description}
                            className={cn(
                              "relative flex flex-col items-start gap-1 rounded-xl border p-2.5 text-left transition-all",
                              selected
                                ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40"
                                : "border-border bg-card hover:border-emerald-300 hover:bg-emerald-50/40 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
                            )}
                          >
                            {selected && (
                              <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                            <span
                              className="text-lg leading-none"
                              aria-hidden="true"
                            >
                              {t.emoji}
                            </span>
                            <span className="line-clamp-1 pr-4 text-xs font-semibold text-foreground">
                              {t.name}
                            </span>
                            <span className="line-clamp-2 text-[10px] leading-snug text-muted-foreground">
                              {t.description}
                            </span>
                            <span className="mt-0.5 inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                              {pdfCategoryLabel(t.category)}
                            </span>
                            {/* Mini color preview */}
                            <div className="mt-1.5 flex items-center gap-1">
                              <span
                                className="h-2.5 w-2.5 rounded-full border border-black/5 dark:border-white/10"
                                style={{ backgroundColor: t.theme.primary }}
                                aria-hidden="true"
                              />
                              <span
                                className="h-2.5 w-2.5 rounded-full border border-black/5 dark:border-white/10"
                                style={{ backgroundColor: t.theme.secondary }}
                                aria-hidden="true"
                              />
                              <span
                                className="h-2.5 w-2.5 rounded-full border border-black/5 dark:border-white/10"
                                style={{ backgroundColor: t.theme.accent }}
                                aria-hidden="true"
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected template name */}
                  <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/60 px-3 py-2 dark:border-emerald-900 dark:bg-emerald-950/30">
                    <Check className="h-3.5 w-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span className="text-xs text-muted-foreground">
                      Template terpilih:
                    </span>
                    <span className="truncate text-xs font-semibold text-foreground">
                      {selectedPdfTemplate
                        ? `${selectedPdfTemplate.emoji} ${selectedPdfTemplate.name}`
                        : pdfTemplateId}
                    </span>
                  </div>
                </div>
              )}

              {/* 2. Tipe Laporan */}
              <SectionTitle step={2} label="Tipe Laporan" className="mt-5" />
              <Select
                value={reportType}
                onValueChange={(v) => setReportType(v as ExportReportType)}
              >
                <SelectTrigger className="mt-3 w-full">
                  <SelectValue placeholder="Pilih tipe laporan" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_TYPES.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* 3. Cakupan Data */}
              <SectionTitle step={3} label="Cakupan Data" className="mt-5" />
              <div className="mt-3 flex flex-wrap gap-1.5">
                {SCOPE_TYPES.map((s) => (
                  <ScopeTypeButton
                    key={s.id}
                    label={s.label}
                    icon={s.icon}
                    selected={scopeType === s.id}
                    onClick={() => setScopeType(s.id)}
                  />
                ))}
              </div>

              <ScopeDetailEditor
                scopeType={scopeType}
                accountId={accountId}
                setAccountId={setAccountId}
                categoryId={categoryId}
                setCategoryId={setCategoryId}
                groupId={groupId}
                setGroupId={setGroupId}
                tag={tag}
                setTag={setTag}
                from={from}
                setFrom={setFrom}
                to={to}
                setTo={setTo}
                accounts={accounts ?? []}
                categories={categories ?? []}
                groups={groups ?? []}
                tags={tags ?? []}
              />

              {/* 4. Field Selection */}
              <SectionTitle step={4} label="Pilih Field" className="mt-5" />
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FIELD_OPTIONS.map((f) => (
                  <FieldCheckbox
                    key={f.id}
                    id={f.id}
                    label={f.label}
                    checked={fields.includes(f.id)}
                    onToggle={() => toggleField(f.id)}
                  />
                ))}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {fields.length}/{FIELD_OPTIONS.length} field dipilih
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setFields(FIELD_OPTIONS.map((f) => f.id))}
                  >
                    Pilih Semua
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => setFields([])}
                  >
                    Kosongkan
                  </Button>
                </div>
              </div>

              {/* 5. Options */}
              <SectionTitle step={5} label="Opsi Lanjutan" className="mt-5" />
              <div className="mt-3 space-y-3">
                <OptionSwitch
                  label="Sertakan transaksi tersembunyi"
                  desc="Tampilkan transaksi yang ditandai isHidden"
                  checked={includeHidden}
                  onCheckedChange={setIncludeHidden}
                />
                <OptionSwitch
                  label="Tampilkan Ringkasan"
                  desc="Sertakan total pemasukan, pengeluaran & saldo"
                  checked={showSummary}
                  onCheckedChange={setShowSummary}
                />
                <OptionSwitch
                  label="Tampilkan Grafik"
                  desc="Tambahkan visualisasi pada laporan"
                  checked={showCharts}
                  onCheckedChange={setShowCharts}
                />
                <div className="space-y-1.5">
                  <Label htmlFor="exp-title">Judul Laporan</Label>
                  <Input
                    id="exp-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Laporan Keuangan"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exp-watermark">Watermark (opsional)</Label>
                  <Input
                    id="exp-watermark"
                    value={watermark}
                    onChange={(e) => setWatermark(e.target.value)}
                    placeholder="cth. DRAFT, RAHASIA"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="exp-groupby">Kelompokkan Berdasarkan</Label>
                  <Select
                    value={groupBy}
                    onValueChange={(v) =>
                      setGroupBy(
                        v as NonNullable<ExportOptions["groupBy"]> | "none"
                      )
                    }
                  >
                    <SelectTrigger id="exp-groupby" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {GROUP_BY_OPTIONS.map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* 7. Export Buttons */}
              <SectionTitle step={6} label="Unduh Export" className="mt-5" />
              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  onClick={() => downloadExport("pdf")}
                  disabled={downloading !== null}
                  className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {downloading === "pdf" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileText className="h-4 w-4" />
                  )}
                  Export PDF
                </Button>
                <Button
                  onClick={() => downloadExport("excel")}
                  disabled={downloading !== null}
                  variant="outline"
                  className="gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                >
                  {downloading === "excel" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4" />
                  )}
                  Export Excel
                </Button>
                <Button
                  onClick={() => downloadExport("csv")}
                  disabled={downloading !== null}
                  variant="outline"
                  className="gap-1.5"
                >
                  {downloading === "csv" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Table className="h-4 w-4" />
                  )}
                  Export CSV
                </Button>
                <Button
                  onClick={() => downloadExport("json")}
                  disabled={downloading !== null}
                  variant="outline"
                  className="gap-1.5"
                >
                  {downloading === "json" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileJson className="h-4 w-4" />
                  )}
                  Export JSON
                </Button>
                <Button
                  onClick={downloadAllFormats}
                  disabled={downloading !== null}
                  variant="secondary"
                  className="col-span-2 gap-1.5"
                >
                  {downloading === "ALL" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowDownToLine className="h-4 w-4" />
                  )}
                  Export Semua Format
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* ===== Right: Live Preview ===== */}
        <div className="lg:col-span-7">
          <div className="lg:sticky lg:top-4">
            <PreviewPanel
              loading={previewLoading && !preview}
              preview={preview}
              previewError={previewError}
              fields={fields}
              onRetry={() => {
                previewMut.mutate({
                  scope: scope as unknown as Record<string, unknown>,
                  fields,
                  options: options as unknown as Record<string, unknown>,
                });
              }}
            />
          </div>
        </div>
      </div>

      {/* ===== Templates Section ===== */}
      <Card className="p-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Template Tersimpan
              </h3>
              <p className="text-xs text-muted-foreground">
                Gunakan kembali konfigurasi export yang sudah disimpan.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setSaveOpen(true)}
          >
            <Save className="h-3.5 w-3.5" />
            Simpan Baru
          </Button>
        </div>

        <div className="mt-4">
          {templatesLoading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {Array.from({ length: 2 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (templates ?? []).length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border py-10 text-center">
              <LayoutTemplate className="h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-medium text-foreground">
                Belum ada template
              </p>
              <p className="text-xs text-muted-foreground">
                Simpan konfigurasi export saat ini untuk digunakan kembali.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {(templates ?? []).map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onUse={() => applyTemplate(t)}
                  onDelete={() => handleDeleteTemplate(t.id, t.name)}
                  deleting={deleteTplMut.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* ===== Save Template Dialog ===== */}
      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent showCloseButton={false} className="max-w-md gap-0 p-0">
          <DialogHeader className="border-b border-border bg-muted/30 p-5 pb-4">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-base flex items-center gap-2">
                  <Save className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  Simpan Template Export
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Konfigurasi saat ini akan disimpan untuk digunakan kembali.
                </DialogDescription>
              </div>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                  <X className="h-4 w-4" />
                </Button>
              </DialogClose>
            </div>
          </DialogHeader>
          <form onSubmit={handleSaveTemplate} className="flex flex-col">
            <div className="space-y-4 p-5">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-name">Nama Template</Label>
                <Input
                  id="tpl-name"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder="cth. Laporan Bulanan PDF"
                  autoFocus
                />
              </div>
              <div className="rounded-lg border border-border bg-muted/40 p-3 text-xs">
                <p className="font-medium text-foreground">Ringkasan:</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  <li>Format: {FORMAT_LABEL[format]}</li>
                  <li>
                    Tipe:{" "}
                    {REPORT_TYPES.find((r) => r.id === reportType)?.label}
                  </li>
                  <li>Cakupan: {scopeType}</li>
                  <li>Field: {fields.length} dipilih</li>
                </ul>
              </div>
            </div>
            <DialogFooter className="border-t border-border bg-muted/30 p-4">
              <DialogClose asChild>
                <Button
                  type="button"
                  variant="outline"
                  disabled={createTplMut.isPending}
                >
                  Batal
                </Button>
              </DialogClose>
              <Button
                type="submit"
                disabled={createTplMut.isPending}
                className="gap-1 bg-emerald-600 text-white hover:bg-emerald-700"
              >
                {createTplMut.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin" />
                )}
                Simpan Template
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ====================== Sub-components ======================
function SectionTitle({
  step,
  label,
  className,
}: {
  step: number;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
        {step}
      </span>
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
    </div>
  );
}

function FormatCard({
  label,
  desc,
  icon,
  accent,
  selected,
  onClick,
}: {
  label: string;
  desc: string;
  icon: React.ReactNode;
  accent: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all",
        selected
          ? "border-emerald-500 bg-emerald-50 dark:border-emerald-500 dark:bg-emerald-950/40"
          : "border-border bg-card hover:border-emerald-300 hover:bg-emerald-50/40 dark:hover:border-emerald-800 dark:hover:bg-emerald-950/20"
      )}
    >
      <span className={cn("flex h-7 w-7 items-center justify-center rounded-lg", accent)}>
        {icon}
      </span>
      <span className="text-sm font-semibold text-foreground">{label}</span>
      <span className="text-[11px] text-muted-foreground">{desc}</span>
      {selected && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-600 text-white">
          <Check className="h-3 w-3" />
        </span>
      )}
    </button>
  );
}

function ScopeTypeButton({
  label,
  icon,
  selected,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
        selected
          ? "border-emerald-500 bg-emerald-600 text-white"
          : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function FieldCheckbox({
  id,
  label,
  checked,
  onToggle,
}: {
  id: string;
  label: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      htmlFor={`fld-${id}`}
      className={cn(
        "flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 text-xs transition-colors",
        checked
          ? "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-200"
          : "border-border bg-card hover:bg-muted/60"
      )}
    >
      <Checkbox id={`fld-${id}`} checked={checked} onCheckedChange={onToggle} />
      <span className="font-medium">{label}</span>
    </label>
  );
}

function OptionSwitch({
  label,
  desc,
  checked,
  onCheckedChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-[11px] text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function ScopeDetailEditor(props: {
  scopeType: ExportScope["type"];
  accountId: string;
  setAccountId: (v: string) => void;
  categoryId: string;
  setCategoryId: (v: string) => void;
  groupId: string;
  setGroupId: (v: string) => void;
  tag: string;
  setTag: (v: string) => void;
  from: string;
  setFrom: (v: string) => void;
  to: string;
  setTo: (v: string) => void;
  accounts: Array<{ id: string; name: string }>;
  categories: Array<{ id: string; name: string }>;
  groups: Array<{ id: string; name: string }>;
  tags: Array<{ id: string; name: string }>;
}) {
  const {
    scopeType,
    accountId,
    setAccountId,
    categoryId,
    setCategoryId,
    groupId,
    setGroupId,
    tag,
    setTag,
    from,
    setFrom,
    to,
    setTo,
    accounts,
    categories,
    groups,
    tags,
  } = props;

  if (scopeType === "ALL") {
    return (
      <p className="mt-3 text-xs text-muted-foreground">
        Semua transaksi (kecuali tersembunyi) akan diikutsertakan.
      </p>
    );
  }

  if (scopeType === "CUSTOM") {
    return (
      <div className="mt-3 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
        Mode <strong>Custom</strong> memerlukan pemilihan transaksi manual.
        Pilih transaksi dari daftar dan gunakan template ini dengan ID yang
        spesifik.
      </div>
    );
  }

  if (scopeType === "ACCOUNT") {
    return (
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="sc-acc">Pilih Akun</Label>
        <Select value={accountId} onValueChange={setAccountId}>
          <SelectTrigger id="sc-acc" className="w-full">
            <SelectValue placeholder="Semua akun" />
          </SelectTrigger>
          <SelectContent>
            {accounts.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Tidak ada akun.
              </div>
            ) : (
              accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (scopeType === "CATEGORY") {
    return (
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="sc-cat">Pilih Kategori</Label>
        <Select value={categoryId} onValueChange={setCategoryId}>
          <SelectTrigger id="sc-cat" className="w-full">
            <SelectValue placeholder="Semua kategori" />
          </SelectTrigger>
          <SelectContent>
            {categories.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Tidak ada kategori.
              </div>
            ) : (
              categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (scopeType === "GROUP") {
    return (
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="sc-grp">Pilih Grup</Label>
        <Select value={groupId} onValueChange={setGroupId}>
          <SelectTrigger id="sc-grp" className="w-full">
            <SelectValue placeholder="Semua grup" />
          </SelectTrigger>
          <SelectContent>
            {groups.length === 0 ? (
              <div className="px-3 py-2 text-xs text-muted-foreground">
                Tidak ada grup.
              </div>
            ) : (
              groups.map((g) => (
                <SelectItem key={g.id} value={g.id}>
                  {g.name}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (scopeType === "TAG") {
    return (
      <div className="mt-3 space-y-1.5">
        <Label htmlFor="sc-tag">Tag</Label>
        <Input
          id="sc-tag"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="cth. liburan, rumah"
        />
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 8).map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTag(t.name)}
                className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] text-muted-foreground hover:bg-muted"
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (scopeType === "DATE_RANGE") {
    return (
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="space-y-1.5">
          <Label htmlFor="sc-from">Dari Tanggal</Label>
          <Input
            id="sc-from"
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sc-to">Sampai Tanggal</Label>
          <Input
            id="sc-to"
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
      </div>
    );
  }

  return null;
}

// ====================== Preview Panel ======================
function PreviewPanel({
  loading,
  preview,
  previewError,
  fields,
  onRetry,
}: {
  loading: boolean;
  previewError: boolean;
  onRetry: () => void;
  preview:
    | {
        summary: {
          totalIncome: number;
          totalExpense: number;
          balance: number;
          transactionCount: number;
          dateRange: { from: string | null; to: string | null };
        };
        categoryBreakdown: Array<{
          category: string;
          total: number;
          count: number;
          percentage: number;
        }>;
        topMerchants: Array<{
          merchant: string;
          total: number;
          count: number;
        }>;
        transactions: Transaction[];
        fields: string[];
        estimatedSize: string;
      }
    | undefined;
  fields: string[];
}) {
  if (loading && !preview) {
    return (
      <Card className="p-5">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-5 w-20" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      </Card>
    );
  }

  if (previewError && !preview) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10">
          <AlertCircle className="h-7 w-7 text-destructive" />
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">
            Gagal memuat preview
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Server mungkin sedang tidak aktif. Coba lagi sebentar.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-1 gap-1.5"
          onClick={onRetry}
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Coba lagi
        </Button>
      </Card>
    );
  }

  if (!preview) {
    return (
      <Card className="flex flex-col items-center justify-center gap-3 p-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
          {loading ? (
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
          ) : (
            <Eye className="h-7 w-7 text-muted-foreground" />
          )}
        </span>
        <div>
          <p className="text-sm font-medium text-foreground">
            {loading ? "Memuat preview..." : "Menunggu konfigurasi"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {loading
              ? "Mengambil data dari server..."
              : "Preview akan muncul otomatis saat konfigurasi berubah."}
          </p>
        </div>
      </Card>
    );
  }

  const s = preview.summary;
  const hasData = s.transactionCount > 0;
  const topCategories = preview.categoryBreakdown.slice(0, 5);
  const topMerchants = preview.topMerchants.slice(0, 5);
  const previewTxs = preview.transactions.slice(0, 10);

  return (
    <Card className="p-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-semibold text-foreground">
            Live Preview
          </h3>
        </div>
        <Badge
          variant="secondary"
          className="border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
        >
          {preview.estimatedSize}
        </Badge>
      </div>

      {!hasData ? (
        <div className="mt-6 flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted">
            <Database className="h-6 w-6 text-muted-foreground" />
          </span>
          <div>
            <p className="text-sm font-medium text-foreground">
              Tidak ada transaksi
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Ubah cakupan data atau sertakan transaksi tersembunyi untuk
              melihat preview.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <SummaryMini
              label="Pemasukan"
              value={formatCurrencyCompact(s.totalIncome)}
              tone="income"
            />
            <SummaryMini
              label="Pengeluaran"
              value={formatCurrencyCompact(s.totalExpense)}
              tone="expense"
            />
            <SummaryMini
              label="Saldo"
              value={formatCurrencyCompact(s.balance)}
              tone={s.balance >= 0 ? "income" : "expense"}
            />
            <SummaryMini
              label="Transaksi"
              value={String(s.transactionCount)}
              tone="default"
            />
          </div>

          {/* Date range */}
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">Rentang Tanggal</span>
            <span className="font-medium text-foreground">
              {s.dateRange.from && s.dateRange.to
                ? `${formatDate(s.dateRange.from)} — ${formatDate(s.dateRange.to)}`
                : s.dateRange.from
                ? `mulai ${formatDate(s.dateRange.from)}`
                : s.dateRange.to
                ? `hingga ${formatDate(s.dateRange.to)}`
                : "—"}
            </span>
          </div>

          {/* Category breakdown */}
          <div className="rounded-xl border border-border p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
              <Layers className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              Top Kategori
            </p>
            <div className="mt-2 space-y-2">
              {topCategories.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Tidak ada pengeluaran.
                </p>
              ) : (
                topCategories.map((c) => (
                  <CategoryRow
                    key={c.category}
                    name={c.category}
                    total={c.total}
                    percentage={c.percentage}
                    count={c.count}
                  />
                ))
              )}
            </div>
          </div>

          {/* Top merchants */}
          {topMerchants.length > 0 && (
            <div className="rounded-xl border border-border p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Store className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Top Merchant
              </p>
              <div className="mt-2 space-y-1.5">
                {topMerchants.map((m, idx) => (
                  <MerchantRow
                    key={m.merchant}
                    idx={idx + 1}
                    name={m.merchant}
                    total={m.total}
                    count={m.count}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Transaction preview table */}
          <div className="rounded-xl border border-border">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                <Wand2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Preview Transaksi
              </p>
              <span className="text-[11px] text-muted-foreground">
                Menampilkan {previewTxs.length} dari{" "}
                {s.transactionCount} transaksi
              </span>
            </div>
            <div className="max-h-96 overflow-y-auto overflow-x-auto [scrollbar-width:thin]">
              <UiTable>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    {fields.includes("date") && (
                      <TableHead className="text-[11px]">Tanggal</TableHead>
                    )}
                    {fields.includes("type") && (
                      <TableHead className="text-[11px]">Tipe</TableHead>
                    )}
                    {fields.includes("description") && (
                      <TableHead className="text-[11px]">Keterangan</TableHead>
                    )}
                    {fields.includes("category") && (
                      <TableHead className="text-[11px]">Kategori</TableHead>
                    )}
                    {fields.includes("account") && (
                      <TableHead className="text-[11px]">Akun</TableHead>
                    )}
                    {fields.includes("merchant") && (
                      <TableHead className="text-[11px]">Merchant</TableHead>
                    )}
                    {fields.includes("amount") && (
                      <TableHead className="text-[11px] text-right">Jumlah</TableHead>
                    )}
                    {fields.includes("note") && (
                      <TableHead className="text-[11px]">Catatan</TableHead>
                    )}
                    {fields.includes("tags") && (
                      <TableHead className="text-[11px]">Tag</TableHead>
                    )}
                    {fields.includes("mood") && (
                      <TableHead className="text-[11px]">Suasana</TableHead>
                    )}
                    {fields.includes("priority") && (
                      <TableHead className="text-[11px]">Prioritas</TableHead>
                    )}
                    {fields.includes("paymentMethod") && (
                      <TableHead className="text-[11px]">Metode</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {previewTxs.map((tx) => (
                    <PreviewRow
                      key={tx.id}
                      tx={tx}
                      fields={fields}
                    />
                  ))}
                </TableBody>
              </UiTable>
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Tanggal panjang: {formatDateLong(preview.transactions[0]?.date ?? new Date())}
          </p>
        </div>
      )}
    </Card>
  );
}

function SummaryMini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "income" | "expense";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p
        className={cn(
          "mt-1 text-base font-bold tabular-nums",
          tone === "income" && "text-emerald-600 dark:text-emerald-400",
          tone === "expense" && "text-rose-600 dark:text-rose-400"
        )}
      >
        {value}
      </p>
    </div>
  );
}

function CategoryRow({
  name,
  total,
  percentage,
  count,
}: {
  name: string;
  total: number;
  percentage: number;
  count: number;
}) {
  const pct = Math.min(Math.max(percentage, 0), 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-foreground">{name}</span>
        <span className="tabular-nums text-muted-foreground">
          {formatCurrencyCompact(total)} · {count} tx
        </span>
      </div>
      <div
        className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
      >
        <div
          className="h-full rounded-full bg-emerald-500"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function MerchantRow({
  idx,
  name,
  total,
  count,
}: {
  idx: number;
  name: string;
  total: number;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-xs">
      <div className="flex min-w-0 items-center gap-2">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
          {idx}
        </span>
        <span className="truncate font-medium text-foreground">{name}</span>
      </div>
      <span className="tabular-nums text-muted-foreground">
        {formatCurrencyCompact(total)} · {count} tx
      </span>
    </div>
  );
}

function PreviewRow({
  tx,
  fields,
}: {
  tx: Transaction;
  fields: string[];
}) {
  const tags = tx.tags
    ? tx.tags.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  return (
    <TableRow>
      {fields.includes("date") && (
        <TableCell className="text-xs whitespace-nowrap">
          {formatDate(tx.date)}
        </TableCell>
      )}
      {fields.includes("type") && (
        <TableCell className="text-xs whitespace-nowrap">
          <Badge
            variant="secondary"
            className={cn(
              "border-transparent",
              tx.type === "INCOME"
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400"
                : "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400"
            )}
          >
            {tx.type === "INCOME" ? "Masuk" : "Keluar"}
          </Badge>
        </TableCell>
      )}
      {fields.includes("description") && (
        <TableCell className="text-xs max-w-[180px] truncate">
          {tx.description}
        </TableCell>
      )}
      {fields.includes("category") && (
        <TableCell className="text-xs whitespace-nowrap">
          {tx.category?.name ?? "—"}
        </TableCell>
      )}
      {fields.includes("account") && (
        <TableCell className="text-xs whitespace-nowrap">
          {tx.account?.name ?? "—"}
        </TableCell>
      )}
      {fields.includes("merchant") && (
        <TableCell className="text-xs whitespace-nowrap">
          {tx.merchant ?? "—"}
        </TableCell>
      )}
      {fields.includes("amount") && (
        <TableCell
          className={cn(
            "text-xs text-right tabular-nums whitespace-nowrap",
            tx.type === "INCOME"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-rose-600 dark:text-rose-400"
          )}
        >
          {tx.type === "INCOME" ? "+" : "-"}
          {formatCurrency(tx.amount)}
        </TableCell>
      )}
      {fields.includes("note") && (
        <TableCell className="text-xs max-w-[140px] truncate">
          {tx.note ?? "—"}
        </TableCell>
      )}
      {fields.includes("tags") && (
        <TableCell className="text-xs">
          {tags.length === 0 ? (
            "—"
          ) : (
            <div className="flex flex-wrap gap-1">
              {tags.slice(0, 3).map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </TableCell>
      )}
      {fields.includes("mood") && (
        <TableCell className="text-xs whitespace-nowrap">
          {tx.mood ?? "—"}
        </TableCell>
      )}
      {fields.includes("priority") && (
        <TableCell className="text-xs whitespace-nowrap">
          {tx.priority ?? "—"}
        </TableCell>
      )}
      {fields.includes("paymentMethod") && (
        <TableCell className="text-xs whitespace-nowrap">
          {tx.paymentMethod ?? "—"}
        </TableCell>
      )}
    </TableRow>
  );
}

// ====================== Template Card ======================
function TemplateCard({
  template,
  onUse,
  onDelete,
  deleting,
}: {
  template: ExportTemplate;
  onUse: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const fmt =
    template.format === "IMAGE" ? "IMG" : template.format;
  const reportLabel =
    REPORT_TYPES.find((r) => r.id === template.reportType)?.label ??
    template.reportType;
  return (
    <Card className="flex flex-col gap-3 p-4 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {template.name}
          </p>
          <p className="text-[11px] text-muted-foreground">{reportLabel}</p>
        </div>
        <Badge
          variant="secondary"
          className={cn(
            "border-transparent",
            fmt === "PDF" &&
              "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
            fmt === "EXCEL" &&
              "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
            fmt === "CSV" &&
              "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
            fmt === "JSON" &&
              "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
            fmt === "IMG" &&
              "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-400"
          )}
        >
          {fmt}
        </Badge>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          Cakupan:{" "}
          <span className="font-medium text-foreground">
            {template.scope?.type ?? "ALL"}
          </span>
        </span>
        {template.isPreset && (
          <Badge
            variant="outline"
            className="border-emerald-200 text-emerald-700 dark:border-emerald-800 dark:text-emerald-400"
          >
            Preset
          </Badge>
        )}
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="outline"
          className="flex-1 gap-1 border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
          onClick={onUse}
        >
          <Wand2 className="h-3.5 w-3.5" />
          Gunakan
        </Button>
        {!template.isPreset && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                disabled={deleting}
                aria-label="Hapus template"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Hapus template ini?</AlertDialogTitle>
                <AlertDialogDescription>
                  Template <strong>{template.name}</strong> akan dihapus.
                  Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting && (
                    <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                  )}
                  Hapus
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </Card>
  );
}
