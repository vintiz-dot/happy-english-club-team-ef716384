import { supabase } from "@/integrations/supabase/client";
import { mapUpstreamToInvoice } from "./adapter";
import type { InvoiceData, BankInfo } from "./types";

export interface FetchInvoiceResult {
  invoice: InvoiceData;
  bankInfo: BankInfo;
}

/**
 * Shared utility to fetch invoice data for a student and month
 * Used by both single and bulk invoice downloads
 */
export async function fetchInvoiceData(
  studentId: string,
  month: string
): Promise<FetchInvoiceResult> {
  // Fetch student and family info
  const { data: studentData, error: studentError } = await supabase
    .from('students')
    .select('id, full_name, family:families(name)')
    .eq('id', studentId)
    .single();

  if (studentError) throw new Error(`Failed to fetch student: ${studentError.message}`);
  if (!studentData) throw new Error('Student not found');

  // Fetch invoice projection
  const { data: tuitionData, error: tuitionError } = await supabase.functions.invoke(
    'calculate-tuition',
    { body: { studentId, month } }
  );

  if (tuitionError) throw new Error(`Failed to calculate tuition: ${tuitionError.message}`);
  if (!tuitionData) throw new Error('No tuition data returned');

  // Fetch bank info
  const { data: bankData, error: bankError } = await supabase
    .from('bank_info')
    .select('*')
    .limit(1)
    .maybeSingle();

  if (bankError) throw new Error(`Failed to fetch bank info: ${bankError.message}`);
  if (!bankData) throw new Error('Payment information not configured. Please contact administration.');

  // Use class breakdown from tuition data if available, otherwise group by class
  let classBreakdownArray;
  
  if (tuitionData.breakdown?.classes && tuitionData.breakdown.classes.length > 0) {
    // Use the class breakdown directly from the backend
    classBreakdownArray = tuitionData.breakdown.classes.map((c: any) => ({
      class_name: c.class_name || 'Unknown',
      sessions_count: c.sessions_count || 0,
      amount_vnd: c.amount_vnd || 0,
      net_amount_vnd: c.net_amount_vnd,
    }));
  } else {
    // Fallback: Group sessions by class
    const classBreakdown: Record<string, { sessions: any[], total: number }> = {};
    
    for (const session of tuitionData.sessionDetails || []) {
      const className = session.class_name || 'Unknown';
      if (!classBreakdown[className]) {
        classBreakdown[className] = { sessions: [], total: 0 };
      }
      classBreakdown[className].sessions.push(session);
      classBreakdown[className].total += session.rate || 0;
    }
    
    classBreakdownArray = Object.entries(classBreakdown).map(([name, data]) => ({
      class_name: name,
      sessions_count: data.sessions.length,
      amount_vnd: data.total,
      net_amount_vnd: data.total, // No discount info in fallback, net equals gross
    }));
  }

  // A held bill (lessons with no mark, saved figures kept) must not print lines
  // that do not add up to its total: one line, "As charged", when they would not.
  if (tuitionData.held && !tuitionData.held.priced_as_charged) {
    const linesTotal = classBreakdownArray.reduce((n: number, c: any) => n + Number(c.amount_vnd || 0), 0);
    if (linesTotal !== Number(tuitionData.baseAmount ?? 0)) {
      classBreakdownArray = [{
        class_name: 'As charged',
        sessions_count: 0,
        amount_vnd: Number(tuitionData.baseAmount ?? 0),
        net_amount_vnd: Number(tuitionData.totalAmount ?? 0),
      }];
    }
  }

  // Map to invoice format
  const invoice = mapUpstreamToInvoice({
    ...tuitionData,
    student_id: studentData.id,
    student_name: studentData.full_name,
    family_name: studentData.family?.name,
    class_breakdown: classBreakdownArray,
  });

  return { invoice, bankInfo: bankData };
}
