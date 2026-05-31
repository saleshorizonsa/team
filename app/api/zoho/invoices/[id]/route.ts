import { auth } from "@/lib/auth";
import { authorize, AuthzError } from "@/lib/authz";
import { getActiveConnection, ensureOrganizationId, zohoApiGet } from "@/lib/zoho";
import { mapInvoiceToPreview } from "@/lib/zoho-map";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const conn = await getActiveConnection();
    if (!conn) return Response.json({ error: "Zoho is not connected" }, { status: 400 });
    const orgId = await ensureOrganizationId(conn);
    const { id } = await params;

    const data = await zohoApiGet<{ invoice: Record<string, unknown> }>(conn, `/invoices/${id}`, {
      organization_id: orgId,
    });
    return Response.json({ preview: mapInvoiceToPreview(data.invoice) });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: e instanceof Error ? e.message : "Server error" }, { status: 500 });
  }
}
