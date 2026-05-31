import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { getActiveConnection, ensureOrganizationId, zohoApiGet } from "@/lib/zoho";

interface ZInvoice {
  invoice_id: string;
  invoice_number: string;
  customer_name: string;
  date: string;
  status: string;
  total: number;
  sub_total: number;
  currency_code?: string;
}

export async function GET(req: Request) {
  try {
    const session = await auth();
    authorize(session, "adminOnly"); // read-only, ADMIN only

    const conn = await getActiveConnection();
    if (!conn) return Response.json({ error: "Zoho is not connected" }, { status: 400 });
    const orgId = await ensureOrganizationId(conn);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined; // e.g. "paid", "sent"
    // Zoho expects PascalCase filter values (Status.Sent, Status.OverDue, …)
    const STATUS_MAP: Record<string, string> = {
      sent: "Sent", paid: "Paid", overdue: "OverDue", draft: "Draft",
      void: "Void", unpaid: "Unpaid", partiallypaid: "PartiallyPaid", viewed: "Viewed",
    };
    const filterBy = status ? `Status.${STATUS_MAP[status.toLowerCase()] ?? status}` : undefined;
    const data = await zohoApiGet<{ invoices: ZInvoice[] }>(conn, "/invoices", {
      organization_id: orgId,
      ...(filterBy ? { filter_by: filterBy } : {}),
      customer_id: searchParams.get("customer_id") || undefined,
      date_start: searchParams.get("date_start") || undefined,
      date_end: searchParams.get("date_end") || undefined,
      search_text: searchParams.get("q") || undefined,
      per_page: "50",
      sort_column: "date",
      sort_order: "D",
    });

    const invoices = data.invoices ?? [];
    // Mark which are already imported (idempotency hint for the picker)
    const ids = invoices.map((i) => i.invoice_id);
    const imported = ids.length
      ? await db.deal.findMany({
          where: { zohoInvoiceId: { in: ids }, deletedAt: null },
          select: { zohoInvoiceId: true, dealNumber: true },
        })
      : [];
    const importedMap = new Map(imported.map((d) => [d.zohoInvoiceId, d.dealNumber]));

    return Response.json({
      invoices: invoices.map((i) => ({
        invoiceId: i.invoice_id,
        invoiceNumber: i.invoice_number,
        customerName: i.customer_name,
        date: i.date,
        status: i.status,
        total: i.total,
        subTotal: i.sub_total,
        currency: i.currency_code ?? "SAR",
        alreadyImported: importedMap.has(i.invoice_id),
        importedAs: importedMap.get(i.invoice_id) ?? null,
      })),
    });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
