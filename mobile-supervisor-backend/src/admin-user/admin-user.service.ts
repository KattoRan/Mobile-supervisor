import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminUserService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.adminUser.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.adminUser.findUnique({
      where: { id },
      select: { id: true, email: true, name: true },
    });
  }
}
