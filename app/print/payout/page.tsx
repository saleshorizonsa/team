import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PrintButton } from "../_components/print-button";
import type { Prisma } from "@prisma/client";
import type { CompanyInput } from "@/lib/validations";

export const metadata = { title: "Payout Statement" };

const money = (n: number) =>
  n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function periodLabel(period: string): string {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

export default async function PayoutStatementPage({
  searchParams,
}: {
  searchParams: Promise<{ userId?: string; from?: string; to?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const sp = await searchParams;
  const isAdmin = session.user.role === "ADMIN";
  // Non-admins can only print their own statement.
  const userId = isAdmin && sp.userId ? sp.userId : session.user.id;

  const dateFilter: Prisma.DateTimeFilter = {};
  if (sp.from) dateFilter.gte = new Date(sp.from);
  if (sp.to) dateFilter.lte = new Date(sp.to);
  const hasDate = !!(sp.from || sp.to);

  const [person, companyRow, rows] = await Promise.all([
    db.user.findUnique({ where: { id: userId }, select: { fullName: true, email: true, role: true } }),
    db.setting.findUnique({ where: { key: "company_info" } }),
    db.commission.findMany({
      where: {
        userId,
        deal: { deletedAt: null, ...(hasDate ? { dealDate: dateFilter } : {}) },
      },
      include: { deal: { select: { dealNumber: true, customer: { select: { name: true } } } } },
      orderBy: [{ period: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  const company = (companyRow?.value as unknown as CompanyInput) ?? null;
  const rangeLabel = [sp.from, sp.to].filter(Boolean).join("  →  ") || "All time";

  // group by period
  const byPeriod = new Map<string, typeof rows>();
  for (const r of rows) {
    if (!byPeriod.has(r.period)) byPeriod.set(r.period, []);
    byPeriod.get(r.period)!.push(r);
  }
  const periods = [...byPeriod.entries()].sort((a, b) => b[0].localeCompare(a[0]));

  const totalEarned = rows.filter((r) => r.type === "EARNING").reduce((s, r) => s + Number(r.amount), 0);
  const totalClawback = rows.filter((r) => r.type === "CLAWBACK").reduce((s, r) => s + Number(r.amount), 0);
  const totalNet = totalEarned + totalClawback;
  const totalPaid = rows.filter((r) => r.payoutStatus === "PAID").reduce((s, r) => s + Number(r.amount), 0);
  const totalPending = rows.filter((r) => r.payoutStatus === "PENDING").reduce((s, r) => s + Number(r.amount), 0);

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
          <p className="text-lg font-semibold">Payout Statement</p>
          <p className="text-sm text-gray-600">{rangeLabel}</p>
          <p className="text-xs text-gray-500">Generated {new Date().toLocaleDateString("en-GB")}</p>
        </div>
      </div>

      {/* Recipient */}
      <div className="mt-4 rounded border border-gray-300 p-3">
        <p className="text-sm text-gray-500">Statement for</p>
        <p className="text-lg font-semibold">{person?.fullName ?? "—"}</p>
        {person?.email && <p className="text-sm text-gray-600">{person.email}</p>}
      </div>

      <div className="my-4 no-print">
        <PrintButton />
      </div>

      {rows.length === 0 ? (
        <p className="py-10 text-center text-gray-500">No commission records for this selection.</p>
      ) : (
        <>
          {periods.map(([period, lines]) => {
            const net = lines.reduce((s, r) => s + Number(r.amount), 0);
            return (
              <div key={period} className="mb-6">
                <h2 className="mb-1 mt-4 text-base font-semibold">{periodLabel(period)}</h2>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-gray-400">
                      <th className="px-2 py-1.5 text-left font-semibold">Deal</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Customer</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Type</th>
                      <th className="px-2 py-1.5 text-right font-semibold">%</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Amount</th>
                      <th className="px-2 py-1.5 text-left font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((r) => (
                      <tr key={r.id} className="border-b border-gray-200">
                        <td className="px-2 py-1.5 font-mono text-xs">{r.deal.dealNumber}</td>
                        <td className="px-2 py-1.5">{r.deal.customer.name}</td>
                        <td className="px-2 py-1.5">{r.type === "CLAWBACK" ? "Clawback" : "Earning"}</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{Number(r.percent).toFixed(1)}%</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{money(Number(r.amount))}</td>
                        <td className="px-2 py-1.5">{r.payoutStatus === "PAID" ? "Settled" : "Pending"}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-black font-semibold">
                      <td className="px-2 py-1.5" colSpan={4}>Period net</td>
                      <td className="px-2 py-1.5 text-right tabular-nums">{money(net)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            );
          })}

          {/* Grand summary */}
          <div className="mt-6 border-t-2 border-black pt-4">
            <table className="ml-auto w-full max-w-sm text-sm">
              <tbody>
                <tr><td className="py-1">Total earned</td><td className="py-1 text-right tabular-nums">{money(totalEarned)}</td></tr>
                {totalClawback !== 0 && (
                  <tr><td className="py-1">Return clawbacks</td><td className="py-1 text-right tabular-nums">{money(totalClawback)}</td></tr>
                )}
                <tr className="border-t border-gray-400 font-bold">
                  <td className="py-1.5">Net commission</td><td className="py-1.5 text-right tabular-nums">{money(totalNet)}</td>
                </tr>
                <tr><td className="py-1 text-gray-600">Already settled</td><td className="py-1 text-right tabular-nums text-gray-600">{money(totalPaid)}</td></tr>
                <tr className="font-semibold">
                  <td className="py-1">Pending payout</td><td className="py-1 text-right tabular-nums">{money(totalPending)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}

      <p className="mt-8 text-xs text-gray-500">
        Currency: SAR · {rows.length} line(s) · This is a system-generated statement.
      </p>
    </div>
  );
}
