import { auth } from "@/lib/auth";
import { authorize, AuthzError } from "@/lib/authz";
import { getActiveConnection, ensureOrganizationId, zohoApiGet } from "@/lib/zoho";

interface ZBill {
  bill_id: string;
  bill_number: string;
  vendor_name: string;
  date: string;
  total: number;
  status: string;
}

// Optional purchase-cost lookup: list Bills so the admin can fill purchaseTotal.
export async function GET(req: Request) {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const conn = await getActiveConnection();
    if (!conn) return Response.json({ error: "Zoho is not connected" }, { status: 400 });
    const orgId = await ensureOrganizationId(conn);

    const { searchParams } = new URL(req.url);
    const data = await zohoApiGet<{ bills: ZBill[] }>(conn, "/bills", {
      organization_id: orgId,
      search_text: searchParams.get("q") || undefined,
      per_page: "50",
      sort_column: "date",
      sort_order: "D",
    });

    return Response.json({
      bills: (data.bills ?? []).map((b) => ({
        billId: b.bill_id,
        billNumber: b.bill_number,
        vendorName: b.vendor_name,
        date: b.date,
        total: b.total,
        status: b.status,
      })),
    });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
