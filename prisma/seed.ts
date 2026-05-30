import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env");
  }

  // Admin user
  const existing = await db.user.findUnique({ where: { email } });
  if (!existing) {
    const passwordHash = await bcrypt.hash(password, 12);
    await db.user.create({
      data: {
        fullName: "Admin",
        email,
        passwordHash,
        role: Role.ADMIN,
        isActive: true,
      },
    });
    console.log(`✓ Admin created: ${email}`);
  } else {
    console.log(`– Admin already exists: ${email}`);
  }

  // Default commission rules
  await db.setting.upsert({
    where: { key: "commission_rules" },
    create: {
      key: "commission_rules",
      value: {
        scheme: "POOLED",
        ownerPercent: 25,
        salesPoolPercent: 75,
        shares: {},
      },
    },
    update: {},
  });
  console.log("✓ Commission rules seeded");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
