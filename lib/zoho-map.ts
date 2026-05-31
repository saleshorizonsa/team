// Pure mapping from a Zoho Books invoice object to our import preview shape.
// salesTotal = sub_total (PRE-tax); vatAmount = tax_total; vatRate derived.

export interface InvoicePreview {
  invoiceId: string;
  invoiceNumber: string;
  customerName: string;
  zohoCustomerId: string;
  date: string;
  status: string;
  currency: string;
  subTotal: number; // → salesTotal (pre-tax)
  taxTotal: number; // → vatAmount
  total: number;
  vatRatePercent: number; // derived
}

function num(v: unknown): number {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? ""));
  return isNaN(n) ? 0 : n;
}
function str(v: unknown): string {
  return v == null ? "" : String(v);
}

export function mapInvoiceToPreview(inv: Record<string, unknown>): InvoicePreview {
  const subTotal = num(inv.sub_total);
  const taxTotal = num(inv.tax_total);
  const vatRatePercent = subTotal > 0 ? Math.round((taxTotal / subTotal) * 10000) / 100 : 15;
  return {
    invoiceId: str(inv.invoice_id),
    invoiceNumber: str(inv.invoice_number),
    customerName: str(inv.customer_name),
    zohoCustomerId: str(inv.customer_id),
    date: str(inv.date),
    status: str(inv.status),
    currency: str(inv.currency_code) || "SAR",
    subTotal,
    taxTotal,
    total: num(inv.total),
    vatRatePercent,
  };
}
