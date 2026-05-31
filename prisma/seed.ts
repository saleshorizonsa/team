import { PrismaClient, Role, Prisma } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

function periodOf(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env");
  }

  // ── Admin ──
  let admin = await db.user.findUnique({ where: { email } });
  if (!admin) {
    admin = await db.user.create({
      data: {
        fullName: "Admin",
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log(`✓ Admin created: ${email}`);
  } else {
    console.log(`– Admin already exists: ${email}`);
  }

  // ── Default commission rules ──
  await db.setting.upsert({
    where: { key: "commission_rules" },
    create: {
      key: "commission_rules",
      value: { scheme: "POOLED", ownerPercent: 25, salesPoolPercent: 75, shares: {} },
    },
    update: {},
  });
  console.log("✓ Commission rules seeded");

  // ── Sample data (flagged) ──
  if (process.env.SEED_SAMPLE_DATA !== "true") {
    console.log("– Skipping sample data (set SEED_SAMPLE_DATA=true to include)");
    return;
  }

  const marker = await db.customer.findFirst({ where: { name: "Acme Trading Co. (sample)" } });
  if (marker) {
    console.log("– Sample data already present, skipping");
    return;
  }

  const pw = await bcrypt.hash("Password123", 12);
  const sara = await db.user.create({
    data: { fullName: "Sara Al-Otaibi", email: "sara@example.com", passwordHash: pw, role: Role.USER, commissionSharePercent: new Prisma.Decimal(50), isActive: true },
  });
  const omar = await db.user.create({
    data: { fullName: "Omar Khan", email: "omar@example.com", passwordHash: pw, role: Role.USER, commissionSharePercent: new Prisma.Decimal(50), isActive: true },
  });
  console.log("✓ Sample users: sara@example.com / omar@example.com (Password123)");

  // shares 50/50
  await db.setting.update({
    where: { key: "commission_rules" },
    data: { value: { scheme: "POOLED", ownerPercent: 25, salesPoolPercent: 75, shares: { [sara.id]: 50, [omar.id]: 50 } } },
  });

  const customers = await Promise.all(
    [
      "Acme Trading Co. (sample)",
      "Gulf Industrial Supplies (sample)",
      "Najd Construction (sample)",
    ].map((name) =>
      db.customer.create({ data: { name, contactPerson: "Procurement", phone: "+966500000000", createdById: admin!.id } })
    )
  );
  const suppliers = await Promise.all(
    ["Eastern Distributors (sample)", "Riyadh Wholesale (sample)"].map((name) =>
      db.supplier.create({ data: { name, createdById: admin!.id } })
    )
  );
  console.log("✓ Sample customers & suppliers");

  // Leads across stages
  const leadStages = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "NEGOTIATION", "WON"] as const;
  for (let i = 0; i < leadStages.length; i++) {
    await db.lead.create({
      data: {
        title: `Sample opportunity ${i + 1}`,
        customerId: customers[i % customers.length].id,
        source: "REFERRAL",
        stage: leadStages[i],
        estimatedValue: new Prisma.Decimal((i + 1) * 25000),
        ownerId: i % 2 === 0 ? sara.id : omar.id,
      },
    });
  }
  console.log("✓ Sample leads");

  // Deals — mix of statuses; approved ones get commissions
  const now = new Date();
  const dealDefs = [
    { sales: 120000, purchase: 90000, transport: 2000, sp: sara.id, status: "APPROVED", monthsAgo: 2 },
    { sales: 80000, purchase: 55000, transport: 1500, sp: omar.id, status: "APPROVED", monthsAgo: 1 },
    { sales: 200000, purchase: 150000, transport: 5000, sp: sara.id, status: "APPROVED", monthsAgo: 0 },
    { sales: 60000, purchase: 45000, transport: 1000, sp: omar.id, status: "SUBMITTED", monthsAgo: 0 },
    { sales: 95000, purchase: 70000, transport: 0, sp: sara.id, status: "DRAFT", monthsAgo: 0 },
  ];

  let seq = 1;
  const year = now.getFullYear();
  const rules = { ownerPercent: 25, salesPoolPercent: 75, shares: { [sara.id]: 50, [omar.id]: 50 } };

  for (const d of dealDefs) {
    const dealDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - d.monthsAgo, 15));
    const profit = d.sales - d.purchase - d.transport;
    const vatAmount = (d.sales * 15) / 100;
    const deal = await db.deal.create({
      data: {
        dealNumber: `D-${year}-${String(seq++).padStart(4, "0")}`,
        customerId: customers[seq % customers.length].id,
        supplierId: suppliers[seq % suppliers.length].id,
        salespersonId: d.sp,
        salesTotal: new Prisma.Decimal(d.sales),
        purchaseTotal: new Prisma.Decimal(d.purchase),
        transportation: new Prisma.Decimal(d.transport),
        vatRatePercent: new Prisma.Decimal(15),
        vatAmount: new Prisma.Decimal(vatAmount),
        profit: new Prisma.Decimal(profit),
        status: d.status as "APPROVED" | "SUBMITTED" | "DRAFT",
        approvedById: d.status === "APPROVED" ? admin!.id : null,
        approvedAt: d.status === "APPROVED" ? new Date() : null,
        dealDate,
        createdById: d.sp,
      },
    });

    if (d.status === "APPROVED") {
      const period = periodOf(dealDate);
      const totalShares = 100;
      const lines = [
        { userId: admin!.id, role: Role.ADMIN, pct: rules.ownerPercent },
        { userId: sara.id, role: Role.USER, pct: (rules.salesPoolPercent * rules.shares[sara.id]) / totalShares },
        { userId: omar.id, role: Role.USER, pct: (rules.salesPoolPercent * rules.shares[omar.id]) / totalShares },
      ];
      for (const l of lines) {
        await db.commission.create({
          data: {
            dealId: deal.id,
            userId: l.userId,
            role: l.role,
            percent: new Prisma.Decimal(l.pct.toFixed(2)),
            amount: new Prisma.Decimal(((profit * l.pct) / 100).toFixed(2)),
            period,
            payoutStatus: "PENDING",
          },
        });
      }
    }
  }
  console.log("✓ Sample deals & commissions");
  console.log("✓ Sample data complete");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
