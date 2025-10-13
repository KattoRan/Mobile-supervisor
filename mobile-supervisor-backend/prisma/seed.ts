import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
const prisma = new PrismaClient();

async function main() {
  const email = 'admin@example.com';
  const name = 'Admin';
  const pass = 'admin123';
  const passwordHash = await bcrypt.hash(pass, 12);

  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, name, passwordHash },
  });

  console.log('Seeded admin:', email, 'password:', pass);
}
main().finally(() => prisma.$disconnect());
