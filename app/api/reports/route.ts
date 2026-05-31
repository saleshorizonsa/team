import { auth } from "@/lib/auth";
import { authorize, AuthzError } from "@/lib/authz";
import { computeReport, type ReportType } from "@/lib/reports";

const VALID: ReportType[] = ["sales", "purchases", "profit", "vat", "commissions", "returns"];

export async function GET(req: Request) {
  try {
    const session = await auth();
    authorize(session, "read");

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") as ReportType | null;
    if (!type || !VALID.includes(type)) {
      return Response.json({ error: "Invalid report type" }, { status: 400 });
    }

    const rows = await computeReport(type, {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
      salespersonId: searchParams.get("salespersonId") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
    });
    return Response.json({ rows });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
