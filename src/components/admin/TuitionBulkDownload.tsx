"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import JSZip from "jszip";

import type { InvoiceData, BankInfo } from "@/lib/invoice/types";
import { fetchInvoiceData } from "@/lib/invoice/fetchInvoiceData";
import { InvoicePrintView } from "@/components/invoice/InvoicePrintView";
import { useIvory } from "@/hooks/useIvory";

type Pair = { invoice: InvoiceData; bankInfo: BankInfo | null };
type Scope = "all" | "class" | "family";

// A4 sizing at ~90% of printable content area to avoid cropping
const CONTENT_SCALE = 0.9;
const DPI = 96;
const A4_W_MM = 210;
const A4_H_MM = 297;
const MARGIN_MM = 10; // must match jsPDF margin
const PX_PER_MM = DPI / 25.4;
const CONTENT_W_PX = Math.round((A4_W_MM - 2 * MARGIN_MM) * PX_PER_MM * CONTENT_SCALE); // ≈ 646 px
const CONTENT_H_PX = Math.round((A4_H_MM - 2 * MARGIN_MM) * PX_PER_MM * CONTENT_SCALE); // ≈ 942 px

export function TuitionBulkDownload({ month }: { month: string }) {
  const { toast } = useToast();
  // Ivory touches the on-screen controls only. The invoice page wrapper below
  // (.bulk-invoice-page) is captured by html2canvas into the PDF: it stays as is.
  const ivory = useIvory();
  const iv = (n: string, o: string) => (ivory ? n : o);
  const [loadingIds, setLoadingIds] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [scope, setScope] = useState<Scope>("all");
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedFamilyId, setSelectedFamilyId] = useState<string>("");
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [includeInactive, setIncludeInactive] = useState(false);

  // PDF build state
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number }>({ done: 0, total: 0 });
  const [ready, setReady] = useState(false);
  const pdfMapRef = useRef<Map<string, Blob>>(new Map());
  const pageRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Pickers
  const { data: classes = [] } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("classes").select("id,name").order("name", { ascending: true });
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  const { data: families = [] } = useQuery({
    queryKey: ["families"],
    queryFn: async () => {
      const { data, error } = await supabase.from("families").select("id,name").order("name", { ascending: true });
      if (error) throw error;
      return data as { id: string; name: string }[];
    },
  });

  // Resolve student IDs for the chosen scope
  const { data: scopedIds = [], isLoading: idsLoading } = useQuery({
    queryKey: ["bulk-scope-ids", scope, selectedClassId, selectedFamilyId, includeInactive],
    enabled: scope !== undefined,
    queryFn: async () => {
      setLoadingIds(true);
      try {
        if (scope === "all") {
          let q = supabase.from("students").select("id");
          if (!includeInactive) q = q.eq("is_active", true);
          const { data, error } = await q;
          if (error) throw error;
          return (data ?? []).map((r: any) => r.id as string);
        }

        if (scope === "class") {
          if (!selectedClassId) return [];
          // Use enrollments(student_id, class_id)
          const { data: enrollments, error: enrollErr } = await supabase
            .from("enrollments")
            .select("student_id")
            .eq("class_id", selectedClassId);
          if (enrollErr) throw enrollErr;
          const enrolled = (enrollments ?? []).map((e: any) => e.student_id as string);
          if (enrolled.length === 0) return [];
          if (!includeInactive) {
            const { data: active, error } = await supabase
              .from("students")
              .select("id")
              .in("id", enrolled)
              .eq("is_active", true);
            if (error) throw error;
            return (active ?? []).map((r: any) => r.id as string);
          }
          return enrolled;
        }

        if (scope === "family") {
          if (!selectedFamilyId) return [];
          let q = supabase.from("students").select("id").eq("family_id", selectedFamilyId);
          if (!includeInactive) q = q.eq("is_active", true);
          const { data, error } = await q;
          if (error) throw error;
          return (data ?? []).map((r: any) => r.id as string);
        }

        return [];
      } finally {
        setLoadingIds(false);
      }
    },
  });

  const sortedPairs = useMemo(() => {
    return [...pairs].sort((a, b) =>
      a.invoice.student.full_name.localeCompare(b.invoice.student.full_name, undefined, { sensitivity: "base" }),
    );
  }, [pairs]);

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    // @ts-ignore Safari fallback
    if (!("download" in HTMLAnchorElement.prototype)) window.open(url, "_blank");
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 1000);
  }

  function sanitizeFilename(name: string) {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/gi, "_");
  }

  async function waitForImages(root: HTMLElement) {
    const imgs = Array.from(root.querySelectorAll("img"));
    for (const img of imgs) {
      const el = img as HTMLImageElement;
      try {
        (el as any).loading = "eager";
        el.decoding = "sync";
        el.crossOrigin = "anonymous";
      } catch {}
    }
    await Promise.all(
      imgs.map((img) => {
        const el = img as HTMLImageElement;
        if (el.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          el.onload = () => resolve();
          el.onerror = () => resolve();
        });
      }),
    );
    await Promise.all(
      imgs.map((img) => {
        const el = img as HTMLImageElement;
        return typeof el.decode === "function" ? el.decode().catch(() => {}) : Promise.resolve();
      }),
    );
  }

  function nextFrame() {
    return new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  }

  async function waitForFonts() {
    try {
      // @ts-ignore
      if (document.fonts && typeof document.fonts.ready?.then === "function") {
        // @ts-ignore
        await document.fonts.ready;
      }
    } catch {}
  }

  async function ensureLaidOut(el: HTMLElement) {
    await nextFrame();
    await new Promise((r) => setTimeout(r, 40));
    // force reflow
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    el.offsetHeight;
    await nextFrame();
  }

  // Load invoice pairs then open preview
  const loadInvoices = async () => {
    if (!month) {
      toast({ title: "Month required", variant: "destructive" });
      return;
    }
    if (scope === "class" && !selectedClassId) {
      toast({ title: "Select a class", variant: "destructive" });
      return;
    }
    if (scope === "family" && !selectedFamilyId) {
      toast({ title: "Select a family", variant: "destructive" });
      return;
    }
    if (scopedIds.length === 0) {
      toast({ title: "No students found for this scope" });
      return;
    }

    setLoadingInvoices(true);
    setPairs([]);
    pdfMapRef.current = new Map();
    setReady(false);
    setProgress({ done: 0, total: 0 });

    try {
      const results: Pair[] = [];
      for (let i = 0; i < scopedIds.length; i++) {
        const sid = scopedIds[i];
        const { invoice, bankInfo } = await fetchInvoiceData(sid, month);
        results.push({ invoice, bankInfo });
        if ((i + 1) % 5 === 0 || i === scopedIds.length - 1) {
          toast({ title: "Loaded invoices", description: `${i + 1}/${scopedIds.length}` });
        }
      }
      setPairs(results);
      setShowPreview(true);
    } catch (e: any) {
      toast({ title: "Load failed", description: e?.message ?? "Unknown error", variant: "destructive" });
    } finally {
      setLoadingInvoices(false);
    }
  };

  // Build PDFs after the preview is shown and DOM is rendered
  useEffect(() => {
    if (!showPreview || pairs.length === 0) return;

    const build = async () => {
      setBuilding(true);
      setProgress({ done: 0, total: pairs.length });

      for (const pair of pairs) {
        const sid = pair.invoice.student.id;
        const node = pageRefs.current[sid];
        if (!node) {
          setProgress((p) => ({ done: Math.min(p.done + 1, p.total), total: p.total }));
          continue;
        }

        // Ensure node matches content area
        node.style.width = `${CONTENT_W_PX}px`;
        node.style.minHeight = `${CONTENT_H_PX}px`;
        node.style.background = "#ffffff";

        await ensureLaidOut(node);
        await waitForFonts();
        await waitForImages(node);
        await ensureLaidOut(node);

        try {
          // Use html2canvas + jsPDF directly (safer than html2pdf.js)
          const { default: html2canvas } = await import("html2canvas");
          const { jsPDF } = await import("jspdf");
          const canvas = await html2canvas(node, {
            scale: 2,
            useCORS: true,
            backgroundColor: "#ffffff",
            logging: false,
            windowWidth: CONTENT_W_PX,
          });

          const imgData = canvas.toDataURL("image/jpeg", 0.95);
          const pdf = new jsPDF({
            unit: "mm",
            format: "a4",
            orientation: "portrait",
          });

          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = pdfWidth - 2 * MARGIN_MM;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          pdf.addImage(imgData, "JPEG", MARGIN_MM, MARGIN_MM, imgWidth, Math.min(imgHeight, pdfHeight - 2 * MARGIN_MM));

          const blob = pdf.output("blob");
          pdfMapRef.current.set(sid, blob);
        } catch (err) {
          console.warn("PDF generation failed for", sid, err);
        } finally {
          setProgress((p) => ({ done: Math.min(p.done + 1, p.total), total: p.total }));
        }
      }

      setBuilding(false);
      setReady(pdfMapRef.current.size === pairs.length);
      if (pdfMapRef.current.size !== pairs.length) {
        toast({ title: "Some PDFs failed", description: `${pdfMapRef.current.size}/${pairs.length} ready` });
      } else {
        toast({ title: "PDFs ready", description: `${pairs.length} generated` });
      }
    };

    const t = setTimeout(build, 50);
    return () => clearTimeout(t);
  }, [showPreview, pairs]);

  const handleZipDownload = async () => {
    if (!ready || pdfMapRef.current.size === 0) return;
    const zip = new JSZip();
    for (const pair of pairs) {
      const sid = pair.invoice.student.id;
      const blob = pdfMapRef.current.get(sid);
      if (!blob) continue;
      const fileName = `${sanitizeFilename(pair.invoice.student.full_name)}_${month}.pdf`;
      zip.file(fileName, blob);
    }
    const zipBlob = await zip.generateAsync({ type: "blob" });
    triggerDownload(zipBlob, `invoices-${month}-${pdfMapRef.current.size}.zip`);
  };

  const regenerate = () => {
    if (!showPreview || pairs.length === 0) return;
    setReady(false);
    setProgress({ done: 0, total: pairs.length });
    pdfMapRef.current = new Map();
    setBuilding(true);
    setShowPreview(false);
    setTimeout(() => setShowPreview(true), 0);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Bulk Invoice Download</CardTitle>
          <CardDescription>Preview invoices, then generate PDFs and ZIP</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className={iv("text-hec-small font-medium text-hec-ink", "text-sm font-medium")}>Scope</label>
              <Select value={scope} onValueChange={(v: Scope) => setScope(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select scope" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All students</SelectItem>
                  <SelectItem value="class">By class</SelectItem>
                  <SelectItem value="family">By family</SelectItem>
                </SelectContent>
              </Select>
              <label className={iv("mt-2 flex min-h-hec-target select-none items-center gap-3 text-hec-small text-hec-ink", "flex items-center gap-2 text-sm mt-2 select-none")}>
                <input
                  type="checkbox"
                  className={iv("h-5 w-5 shrink-0 accent-hec-action focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-hec-ring", "h-4 w-4")}
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                />
                Include inactive students
              </label>
            </div>

            {scope === "class" && (
              <div className="space-y-2">
                <label className={iv("text-hec-small font-medium text-hec-ink", "text-sm font-medium")}>Class</label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {scope === "family" && (
              <div className="space-y-2">
                <label className={iv("text-hec-small font-medium text-hec-ink", "text-sm font-medium")}>Family</label>
                <Select value={selectedFamilyId} onValueChange={setSelectedFamilyId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a family" />
                  </SelectTrigger>
                  <SelectContent>
                    {families.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className={iv("flex flex-wrap items-center gap-3", "flex items-center gap-2")}>
            <Button onClick={loadInvoices} disabled={loadingInvoices || loadingIds || idsLoading}>
              {loadingInvoices ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading…
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Load & Preview ({scopedIds.length})
                </>
              )}
            </Button>
            <div className={iv("text-hec-small text-hec-ink-soft", "text-xs text-muted-foreground")}>
              Month: <span className={iv("tabular-nums", "font-mono")}>{month}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
          <div className={iv("no-print mb-3 flex flex-wrap items-center justify-between gap-3", "flex items-center justify-between mb-3 no-print gap-2")}>
            <div className={iv("text-hec-small tabular-nums text-hec-ink", "text-sm")}>
              {building ? (
                <>
                  Rendering PDFs… {progress.done}/{progress.total}
                </>
              ) : ready ? (
                <>PDFs ready: {pairs.length}</>
              ) : pairs.length ? (
                <>Preview ready. Click “Regenerate PDFs” if needed.</>
              ) : null}
            </div>
            <div className={iv("flex flex-wrap gap-2", "flex gap-2")}>
              <Button variant="outline" onClick={regenerate} disabled={building || pairs.length === 0}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate PDFs
              </Button>
              <Button onClick={handleZipDownload} disabled={!ready}>
                <Download className="h-4 w-4 mr-2" />
                Download ZIP
              </Button>
            </div>
          </div>

          {pairs.length === 0 ? (
            <div className={iv("text-hec-small text-hec-ink-soft", "text-sm text-muted-foreground")}>No invoices loaded</div>
          ) : (
            <div className="space-y-4">
              {pairs.map((p) => (
                <div
                  key={p.invoice.student.id}
                  ref={(el) => {
                    pageRefs.current[p.invoice.student.id] = el;
                  }}
                  className="bulk-invoice-page bg-white p-0 border border-gray-200 shadow-sm"
                  style={{ width: `${CONTENT_W_PX}px`, minHeight: `${CONTENT_H_PX}px`, margin: "0 auto" }}
                >
                  <InvoicePrintView invoice={p.invoice} bankInfo={p.bankInfo} />
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        .page-break { break-after: page; }
        @media print {
          .no-print { display: none !important; }
          .page-break { display: block; page-break-after: always; }
          .print-page { page-break-inside: avoid; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </>
  );
}
