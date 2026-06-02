import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { authorize, AuthzError } from "@/lib/authz";
import { logAudit } from "@/lib/audit";
import { userUpdateSchema } from "@/lib/validations";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return Response.json({ error: "Not found" }, { status: 404 });

    const body = await req.json();
    const data = userUpdateSchema.parse(body);

    // Guard: don't let an admin deactivate or demote themselves into lockout
    if (id === session!.user.id && (!data.isActive || data.role !== "ADMIN")) {
      return Response.json({ error: "You cannot deactivate or demote your own admin account" }, { status: 422 });
    }

    const before = {
      fullName: user.fullName, role: user.role,
      commissionSharePercent: user.commissionSharePercent, isActive: user.isActive,
    };

    const updated = await db.user.update({
      where: { id },
      data: {
        fullName: data.fullName,
        role: data.role,
        commissionSharePercent: data.commissionSharePercent ?? null,
        isActive: data.isActive,
      },
      select: {
        id: true, fullName: true, email: true, role: true,
        commissionSharePercent: true, isActive: true, createdAt: true,
      },
    });

    await logAudit({
      userId: session!.user.id,
      action: "UPDATE",
      entityType: "User",
      entityId: id,
      before,
      after: { fullName: updated.fullName, role: updated.role, isActive: updated.isActive },
    });

    return Response.json({
      ...updated,
      commissionSharePercent: updated.commissionSharePercent != null ? Number(updated.commissionSharePercent) : null,
    });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();
    authorize(session, "adminOnly");

    const { id } = await params;
    const user = await db.user.findUnique({ where: { id } });
    if (!user) return Response.json({ error: "Not found" }, { status: 404 });

    // An admin can't delete their own account.
    if (id === session!.user.id) {
      return Response.json({ error: "You cannot delete your own account" }, { status: 422 });
    }

    // Business footprint: a user named on deals/commissions/etc. must NOT be
    // hard-deleted — it would corrupt the shared history. Deactivate instead.
    const [createdDeals, salesDeals, commissions, leads, customers, suppliers, returns, zoho] =
      await Promise.all([
        db.deal.count({ where: { createdById: id } }),
        db.deal.count({ where: { salespersonId: id } }),
        db.commission.count({ where: { userId: id } }),
        db.lead.count({ where: { ownerId: id } }),
        db.customer.count({ where: { createdById: id } }),
        db.supplier.count({ where: { createdById: id } }),
        db.return.count({ where: { createdById: id } }),
        db.zohoConnection.count({ where: { connectedById: id } }),
      ]);

    const refs = createdDeals + salesDeals + commissions + leads + customers + suppliers + returns + zoho;
    if (refs > 0) {
      return Response.json(
        {
          error:
            "This user has deals, commissions or other records and can't be deleted without breaking that history. Deactivate them instead (Edit → set Inactive).",
        },
        { status: 422 }
      );
    }

    // No business footprint — remove their dependent rows, then the account.
    await db.auditLog.deleteMany({ where: { userId: id } });
    await db.notification.deleteMany({ where: { userId: id } });
    await db.user.delete({ where: { id } });

    await logAudit({
      userId: session!.user.id,
      action: "DELETE",
      entityType: "User",
      entityId: id,
      before: { fullName: user.fullName, email: user.email, role: user.role },
    });

    return new Response(null, { status: 204 });
  } catch (e) {
    if (e instanceof AuthzError) return e.toResponse();
    return Response.json({ error: "Server error" }, { status: 500 });
  }
}
