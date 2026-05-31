import { auth } from "@/lib/auth";
import { authorize, AuthzError } from "@/lib/authz";
import { getActiveConnection, ensureOrganizationId, zohoApiGet } from "@/lib/zoho";

interface ZPO {
  purchaseorder_id: string;
  purchaseorder_number: string;
  vendor_name: string;
  date: string;
  total: number;
  status: string;
}

// ADMIN-only, read-only: list Zoho Purchase Orders to fill a deal's purchase cost.
export async function GET(req: Request) {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const conn = await getActiveConnection();
    if (!conn) return Response.json({ error: "Zoho is not connected" }, { status: 400 });
    const orgId = await ensureOrganizationId(conn);

    const { searchParams } = new URL(req.url);
    const data = await zohoApiGet<{ purchaseorders: ZPO[] }>(conn, "/purchaseorders", {
      organization_id: orgId,
      search_text: searchParams.get("q") || undefined,
      per_page: "50",
      sort_column: "date",
      sort_order: "D",
    });

    return Response.json({
      purchaseOrders: (data.purchaseorders ?? []).map((p) => ({
        id: p.purchaseorder_id,
        number: p.purchaseorder_number,
        vendorName: p.vendor_name,
        date: p.date,
        total: p.total,
        status: p.status,
      })),
    });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
