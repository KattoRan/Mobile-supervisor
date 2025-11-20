import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = 'admin1';
  const password = 'Admin@123';

  const existing = await prisma.admin.findUnique({ where: { username } });
  if (existing) {
    console.log('Admin đã tồn tại:', username);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.admin.create({
    data: {
      username,
      password: passwordHash,
    },
  });

  console.log('Tạo admin thành công:');
  console.log('Email:', username);
  console.log('Password:', password);
  console.log('ID:', admin.id);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error(err);
    prisma.$disconnect();
  });
