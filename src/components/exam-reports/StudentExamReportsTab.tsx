import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileText, Download, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { sanitizeHtml } from "@/lib/sanitize";
import { useToast } from "@/hooks/use-toast";

interface StudentExamReportsTabProps {
  studentId: string;
}

interface PdfUrlState {
  [reportId: string]: string;
}

export function StudentExamReportsTab({ studentId }: StudentExamReportsTabProps) {
  const { toast } = useToast();
  const [pdfUrls, setPdfUrls] = useState<PdfUrlState>({});
  const [downloading, setDownloading] = useState<Record<string, boolean>>({});

  const { data: reports, isLoading } = useQuery({
    queryKey: ["student-exam-reports", studentId],
    enabled: !!studentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("exam_reports")
        .select("id, title, content_html, file_storage_key, file_name, exam_date, classes(name), created_at")
        .eq("student_id", studentId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const ensurePdfUrl = async (reportId: string, storageKey: string) => {
    if (pdfUrls[reportId]) return pdfUrls[reportId];
    const { data, error } = await supabase.storage
      .from("exam-reports")
      .createSignedUrl(storageKey, 3600);
    if (error || !data?.signedUrl) {
      toast({ title: "Could not load PDF", description: error?.message, variant: "destructive" });
      return null;
    }
    setPdfUrls((p) => ({ ...p, [reportId]: data.signedUrl }));
    return data.signedUrl;
  };

  const handleDownload = async (reportId: string, storageKey: string, fileName: string) => {
    setDownloading((d) => ({ ...d, [reportId]: true }));
    try {
      const url = await ensurePdfUrl(reportId, storageKey);
      if (!url) return;
      const resp = await fetch(url);
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err: any) {
      toast({ title: "Download failed", description: err.message, variant: "destructive" });
    } finally {
      setDownloading((d) => ({ ...d, [reportId]: false }));
    }
  };

  if (isLoading) {
    return <p className="text-hec-small text-hec-ink-soft">Loading exam reports…</p>;
  }

  if (!reports || reports.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-hec-ink-faint" aria-hidden />
          <p className="text-hec-small text-hec-ink-soft">No exam reports yet. When your teacher posts one, it will appear here.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((r: any) => (
        <ExamReportCard
          key={r.id}
          report={r}
          pdfUrl={pdfUrls[r.id] || null}
          onLoadPdf={() => r.file_storage_key && ensurePdfUrl(r.id, r.file_storage_key)}
          onDownload={() => r.file_storage_key && r.file_name && handleDownload(r.id, r.file_storage_key, r.file_name)}
          downloading={!!downloading[r.id]}
        />
      ))}
    </div>
  );
}

function ExamReportCard({
  report, pdfUrl, onLoadPdf, onDownload, downloading,
}: {
  report: any;
  pdfUrl: string | null;
  onLoadPdf: () => void;
  onDownload: () => void;
  downloading: boolean;
}) {
  const [pdfRequested, setPdfRequested] = useState(false);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <CardTitle className="break-words">{report.title}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              {report.classes?.name && <Badge variant="secondary" className="whitespace-normal break-words text-left">{report.classes.name}</Badge>}
              {report.exam_date && (
                <Badge variant="outline" className="tabular-nums">Exam: {format(new Date(report.exam_date), "MMM d, yyyy")}</Badge>
              )}
              <Badge variant="outline" className="tabular-nums">Posted {format(new Date(report.created_at), "MMM d, yyyy")}</Badge>
            </div>
          </div>
          {report.file_storage_key && report.file_name && (
            <Button
              size="lg"
              onClick={onDownload}
              disabled={downloading}
              className="w-full sm:w-auto"
            >
              {downloading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
              Download PDF
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {report.content_html && (
          <div
            className="prose prose-sm md:prose-base max-w-none text-hec-body text-hec-ink"
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(report.content_html) }}
          />
        )}

        {report.file_storage_key && (
          <div className="overflow-hidden rounded-hec-md border border-hec-line bg-hec-sunken">
            {!pdfRequested ? (
              <div className="p-6 flex flex-col items-center gap-3">
                <FileText className="h-10 w-10 text-hec-ink-soft" aria-hidden />
                <p className="max-w-full break-words text-center text-hec-small text-hec-ink-soft">{report.file_name}</p>
                <Button
                  variant="outline"
                  onClick={() => { setPdfRequested(true); onLoadPdf(); }}
                >
                  Preview PDF in browser
                </Button>
              </div>
            ) : pdfUrl ? (
              <iframe
                src={pdfUrl}
                className="w-full h-[600px] bg-hec-raised"
                title={report.title}
              />
            ) : (
              <div className="p-6 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-hec-ink-faint" />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
