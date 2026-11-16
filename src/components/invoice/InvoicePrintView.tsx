import { useEffect, useState } from "react";
import type { InvoiceData, BankInfo } from "@/lib/invoice/types";
import { formatVND, formatDate, formatMonth } from "@/lib/invoice/formatter";
import { supabase } from "@/integrations/supabase/client";

interface InvoicePrintViewProps {
  invoice: InvoiceData;
  bankInfo: BankInfo | null;
}

export function InvoicePrintView({ invoice, bankInfo }: InvoicePrintViewProps) {
  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    if (bankInfo?.vietqr_storage_key) {
      const { data } = supabase.storage
        .from('qr-codes')
        .getPublicUrl(bankInfo.vietqr_storage_key);
      setQrUrl(data.publicUrl);
    }
  }, [bankInfo?.vietqr_storage_key]);

  return (
    <div data-hec-document="" className="invoice-print-view bg-white text-black p-8 max-w-[210mm] mx-auto relative min-h-[297mm]" style={{ paddingTop: '20%' }}>
      {/* Background */}
      <div 
        className="absolute inset-0 opacity-95 pointer-events-none"
        style={{
          backgroundImage: 'url(/invoice-background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-2">
              {bankInfo?.org_name || 'Happy English Club'}
            </h1>
            {bankInfo?.org_address && (
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {bankInfo.org_address}
              </p>
            )}
          </div>
          <div className="text-right">
            <div className="mb-3">
              <div className="text-xs text-gray-600 font-semibold">INVOICE #</div>
              <div className="text-lg font-bold">{invoice.invoice_number}</div>
            </div>
            <div className="mb-3">
              <div className="text-xs text-gray-600 font-semibold">ISSUE DATE</div>
              <div>{formatDate(invoice.issue_date, 'en-US')}</div>
            </div>
            <div>
              <div className="text-xs text-gray-600 font-semibold">BILLING PERIOD</div>
              <div>{formatMonth(invoice.billing_period)}</div>
            </div>
          </div>
        </div>

        {/* Bill To */}
        <div className="mb-6 p-4 bg-white/80 rounded">
          <div className="font-semibold mb-1">Bill To:</div>
          <div>Parents/Guardians of {invoice.student.full_name}</div>
          {invoice.family?.name && <div className="text-sm text-gray-600">{invoice.family.name}</div>}
          <div className="mt-2 text-sm text-gray-700">{invoice.bill_to_text}</div>
          <div className="text-xs text-gray-600 mt-1">
            This invoice includes all scheduled sessions for the month.
          </div>
        </div>

        {/* Class Breakdown */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Class Breakdown</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 px-2 font-semibold">Class</th>
                <th className="text-center py-2 px-2 font-semibold w-20">Sessions</th>
                <th className="text-right py-2 px-2 font-semibold w-28">Gross</th>
                <th className="text-right py-2 px-2 font-semibold w-28">Net</th>
              </tr>
            </thead>
            <tbody>
              {invoice.classes.map((cls, idx) => {
                const netAmount = cls.net_amount_vnd ?? cls.amount_vnd;
                const hasDiscount = netAmount < cls.amount_vnd;
                return (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-2 px-2">{cls.class_name}</td>
                    <td className="text-center py-2 px-2">{cls.sessions_count}</td>
                    <td className="text-right py-2 px-2 text-gray-500">{formatVND(cls.amount_vnd)} ₫</td>
                    <td className={`text-right py-2 px-2 ${hasDiscount ? 'text-green-700 font-medium' : ''}`}>
                      {formatVND(netAmount)} ₫
                    </td>
                  </tr>
                );
              })}
              <tr className="border-b border-gray-300 bg-gray-50">
                <td colSpan={2} className="py-2 px-2 font-semibold">Subtotal</td>
                <td className="text-right py-2 px-2 text-gray-500">{formatVND(invoice.subtotal_vnd)} ₫</td>
                <td className="text-right py-2 px-2 font-semibold">
                  {formatVND(invoice.classes.reduce((sum, c) => sum + (c.net_amount_vnd ?? c.amount_vnd), 0))} ₫
                </td>
              </tr>
              {invoice.discounts.map((disc, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td colSpan={2} className="py-2 px-2 text-right text-sm">{disc.label}</td>
                  <td className="text-right py-2 px-2 text-sm">{formatVND(disc.amount_vnd)} ₫</td>
                </tr>
              ))}
              <tr className="border-b border-gray-200">
                <td colSpan={2} className="py-2 px-2 font-semibold">Current Month Charges</td>
                <td className="text-right py-2 px-2 font-semibold">{formatVND(invoice.total_due_vnd)} ₫</td>
              </tr>
              <tr className={`border-b border-gray-200 ${invoice.paid_to_date_vnd >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                <td colSpan={2} className={`py-2 px-2 ${invoice.paid_to_date_vnd >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  Prior Balance {invoice.paid_to_date_vnd >= 0 ? '(Credit)' : '(Debt)'}
                </td>
                <td className={`text-right py-2 px-2 ${invoice.paid_to_date_vnd >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatVND(invoice.paid_to_date_vnd)} ₫
                </td>
              </tr>
              <tr className="border-b-2 border-gray-400 bg-blue-50">
                <td colSpan={2} className="py-3 px-2 font-bold text-lg">Final Payable</td>
                <td className="text-right py-3 px-2 font-bold text-lg">
                  {formatVND(invoice.final_payable_vnd)} ₫
                </td>
              </tr>
              <tr className="border-b border-gray-200 bg-green-50">
                <td colSpan={2} className="py-2 px-2 text-green-700">Current Month Recorded Payment</td>
                <td className="text-right py-2 px-2 text-green-700">
                  {formatVND((invoice as any).recorded_payment_vnd || 0)} ₫
                </td>
              </tr>
              <tr className="border-b-2 border-gray-400 bg-yellow-50">
                <td colSpan={2} className="py-3 px-2 font-bold text-lg">Outstanding Balance</td>
                <td className="text-right py-3 px-2 font-bold text-lg">{formatVND(invoice.balance_vnd)} ₫</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Session Details */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-3">Session Details</h2>
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-2 px-2 font-semibold">Date</th>
                <th className="text-left py-2 px-2 font-semibold">Class</th>
                <th className="text-center py-2 px-2 font-semibold">Status</th>
                <th className="text-right py-2 px-2 font-semibold">Unit Price</th>
                <th className="text-right py-2 px-2 font-semibold">Line Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.sessions.map((session, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-1 px-2">{formatDate(session.date)}</td>
                  <td className="py-1 px-2">{session.class_name}</td>
                  <td className="text-center py-1 px-2">{session.status}</td>
                  <td className="text-right py-1 px-2">{formatVND(session.unit_price_vnd)} ₫</td>
                  <td className="text-right py-1 px-2">{formatVND(session.line_total_vnd)} ₫</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Payment Instructions */}
        <div className="mb-6 p-4 bg-white/80 rounded">
          <div className="font-semibold mb-2">Payment Instructions:</div>
          {bankInfo ? (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div><span className="font-medium">Bank Name:</span> {bankInfo.bank_name}</div>
                <div><span className="font-medium">Account Number:</span> {bankInfo.account_number}</div>
                <div><span className="font-medium">Account Name:</span> {bankInfo.account_name}</div>
              </div>
              {qrUrl && (
                <div className="flex justify-center items-center">
                  <img 
                    src={qrUrl} 
                    alt="VietQR Payment Code" 
                    className="h-32 w-32 object-contain border rounded bg-white"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-gray-600 italic">
              Bank information not configured. Please contact administration for payment details.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-xs text-gray-600 text-center mt-8 pt-4 border-t">
          {bankInfo?.org_address && <span>{bankInfo.org_address} • </span>}
          <span>This is a computer-generated invoice.</span>
        </div>
      </div>

      <style>{`
        @media print {
          .invoice-print-view {
            margin: 0;
            padding: 20%;
            padding-top: 20%;
            max-width: 100%;
          }
          @page {
            size: A4;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
