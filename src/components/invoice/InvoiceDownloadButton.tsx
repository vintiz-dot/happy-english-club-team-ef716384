import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchInvoiceData } from "@/lib/invoice/fetchInvoiceData";
import { InvoicePrintView } from "./InvoicePrintView";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { InvoiceData, BankInfo } from "@/lib/invoice/types";
import { tryMakeDocument, invoiceDocData, downloadBlob } from "@/lib/hecDocs";

interface InvoiceDownloadButtonProps {
  studentId: string;
  month: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
}

export function InvoiceDownloadButton({ 
  studentId, 
  month, 
  variant = "outline",
  size = "default" 
}: InvoiceDownloadButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [invoiceData, setInvoiceData] = useState<InvoiceData | null>(null);
  const [bankInfo, setBankInfo] = useState<BankInfo | null>(null);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      const { invoice, bankInfo } = await fetchInvoiceData(studentId, month);
      setInvoiceData(invoice);
      setBankInfo(bankInfo);

      // The premium invoice PDF from HEC Docs downloads straight away. The
      // old preview + browser print opens only when that cannot be made.
      const doc = await tryMakeDocument("invoice", await invoiceDocData(invoice, bankInfo, month));
      if (doc) {
        downloadBlob(doc.blob, doc.filename);
        toast({ title: "Invoice downloaded", description: doc.filename });
        return;
      }

      toast({
        title: "Invoice Loaded",
        description: "Ready to print or save as PDF",
      });
      setShowPreview(true);
    } catch (error: any) {
      toast({
        title: "Error loading invoice",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // The premium invoice PDF from HEC Docs; the browser's print stays as the fallback.
  const [making, setMaking] = useState(false);
  const handlePrint = async () => {
    if (!invoiceData) return window.print();
    setMaking(true);
    try {
      const doc = await tryMakeDocument("invoice", await invoiceDocData(invoiceData, bankInfo, month));
      if (doc) downloadBlob(doc.blob, doc.filename);
      else window.print();
    } finally {
      setMaking(false);
    }
  };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={loadInvoice}
        disabled={loading}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        <span className="ml-2">Download Invoice</span>
      </Button>

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-auto">
          {invoiceData && (
            <>
              <div className="flex justify-end gap-2 mb-4 no-print">
                <Button onClick={handlePrint} disabled={making}>
                  {making && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Print / Save as PDF
                </Button>
                <Button variant="outline" onClick={() => setShowPreview(false)}>
                  Close
                </Button>
              </div>
              <InvoicePrintView invoice={invoiceData} bankInfo={bankInfo} />
            </>
          )}
        </DialogContent>
      </Dialog>

      <style>{`
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
