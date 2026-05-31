import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { computeReport, type ReportType } from "@/lib/reports";
import { PrintButton } from "../_components/print-button";
import type { CompanyInput } from "@/lib/validations";

export const metadata = { title: "Statement" };

const TITLES: Record<ReportType, string> = {
  sales: "Sales Report",
  purchases: "Purchases Report",
  profit: "Profit Report",
  vat: "VAT Report",
  commissions: "Commission Statement",
};

const MONEY_COLS = new Set(["Sales Total", "Purchase Total", "Transportation", "Profit", "VAT Amount", "Amount"]);

export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; from?: string; to?: string; salespersonId?: string; userId?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const type = (sp.type ?? "sales") as ReportType;

  const [rows, companyRow] = await Promise.all([
    computeReport(type, { from: sp.from, to: sp.to, salespersonId: sp.salespersonId, userId: sp.userId }),
    db.setting.findUnique({ where: { key: "company_info" } }),
  ]);

  const company = (companyRow?.value as unknown as CompanyInput) ?? null;
  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const totals: Record<string, number> = {};
  for (const c of columns) {
    if (MONEY_COLS.has(c)) totals[c] = rows.reduce((s, r) => s + (typeof r[c] === "number" ? (r[c] as number) : 0), 0);
  }

  const money = (n: number) => n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const rangeLabel = [sp.from, sp.to].filter(Boolean).join("  →  ") || "All time";

  return (
    <div className="mx-auto max-w-3xl p-8">
      <style>{`@media print { .no-print { display:none !important; } @page { margin: 1.5cm; } }`}</style>

      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <h1 className="text-2xl font-bold">{company?.companyName || "Team Trading"}</h1>
          {company?.companyAddress && <p className="text-sm text-gray-600">{company.companyAddress}</p>}
          {company?.companyVatNumber && <p className="text-sm text-gray-600">VAT: {company.companyVatNumber}</p>}
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold">{TITLES[type]}</p>
          <p className="text-sm text-gray-600">{rangeLabel}</p>
          <p className="text-xs text-gray-500">Generated {new Date().toLocaleDateString("en-GB")}</p>
        </div>
      </div>

      <div className="my-4 no-print">
        <PrintButton />
      </div>

      {/* Table */}
      {columns.length === 0 ? (
        <p className="py-10 text-center text-gray-500">No records for this selection.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-gray-400">
              {columns.map((c) => (
                <th key={c} className={`py-2 px-2 font-semibold ${MONEY_COLS.has(c) || c.includes("%") ? "text-right" : "text-left"}`}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-gray-200">
                {columns.map((c) => (
                  <td key={c} className={`py-1.5 px-2 ${MONEY_COLS.has(c) || c.includes("%") ? "text-right tabular-nums" : ""}`}>
                    {typeof r[c] === "number" && MONEY_COLS.has(c) ? money(r[c] as number) : String(r[c])}
                  </td>
                ))}
              </tr>
            ))}
            {Object.keys(totals).length > 0 && (
              <tr className="border-t-2 border-black font-bold">
                {columns.map((c, idx) => (
                  <td key={c} className={`py-2 px-2 ${MONEY_COLS.has(c) ? "text-right tabular-nums" : ""}`}>
                    {idx === 0 ? "Total" : MONEY_COLS.has(c) ? money(totals[c]) : ""}
                  </td>
                ))}
              </tr>
            )}
          </tbody>
        </table>
      )}

      <p className="mt-8 text-xs text-gray-500">
        Currency: SAR · {rows.length} record(s) · This is a system-generated statement.
      </p>
    </div>
  );
}
