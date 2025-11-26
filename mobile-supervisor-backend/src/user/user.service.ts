import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UserService {
  constructor(private prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.users.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.users.findUnique({
      where: { id },
      select: { id: true, email: true, full_name: true },
    });
  }

  findByCitizenId(citizenId: string) {
    return this.prisma.users.findUnique({ where: { citizen_id: citizenId } });
  }

  findDeviceByPhone(phoneNumber: string) {
    return this.prisma.devices.findUnique({
      where: { phone_number: phoneNumber },
    });
  }

  create(data: {
    full_name: string;
    email: string;
    address?: string;
    citizen_id: string;
  }) {
    return this.prisma.users.create({ data });
  }

  async createDevice(data: {
    user_id: string;
    api_key: string;
    phone_number: string;
    model?: string;
    type?: string;
    device_os?: string;
  }) {
    return this.prisma.devices.create({ data });
  }
}
