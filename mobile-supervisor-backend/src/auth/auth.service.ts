import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private users: UserService,
    private jwt: JwtService,
    private prisma: PrismaService,
  ) {}

  generateApiKey() {
    return randomBytes(32).toString('hex');
  }

  async validateUser(email: string, password: string) {
    const u = await this.users.findByEmail(email);
    if (!u) throw new UnauthorizedException('Email không tồn tại');
    return {
      id: u.id,
      email: u.email,
      name: u.full_name,
    };
  }

  async loginAdmin(admin: { username: string; pass: string }) {
    // 1. Tìm admin trong DB
    const user = await this.prisma.admin.findUnique({
      where: { username: admin.username },
    });

    if (!user) {
      throw new UnauthorizedException('Admin not found');
    }

    const isMatch = await bcrypt.compare(admin.pass, user.password);

    if (!isMatch) {
      throw new UnauthorizedException('Wrong password');
    }

    // 3. Tạo token
    const payload = {
      userId: user.id,
      username: user.username,
    };

    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      user: {
        id: user.id,
        username: user.username,
      },
    };
  }

  async register(data: {
    fullName: string;
    address?: string;
    email: string;
    citizenId: string;
    phoneNumber: string;
    device: {
      model?: string;
      type?: string;
      os?: string;
    };
  }) {
    // ===== VALIDATE FIELD =====
    if (!data.fullName || !data.email || !data.citizenId || !data.phoneNumber) {
      throw new BadRequestException({
        success: false,
        message: 'Thiếu thông tin bắt buộc',
        errors: {
          field: 'fullName | email | citizenId | phoneNumber',
          detail: 'Vui lòng kiểm tra lại dữ liệu gửi lên',
        },
      });
    }

    // ===== CHECK EMAIL =====
    const emailExists = await this.users.findByEmail(data.email);
    if (emailExists) {
      throw new BadRequestException({
        success: false,
        message: 'Email đã tồn tại',
        errors: {
          field: 'email',
          detail: 'Email này đã được đăng ký trước đó',
        },
      });
    }

    // ===== CHECK CCCD =====
    const cccdExists = await this.users.findByCitizenId(data.citizenId);
    if (cccdExists) {
      throw new BadRequestException({
        success: false,
        message: 'CCCD đã tồn tại',
        errors: {
          field: 'citizenId',
          detail: 'Số CCCD đã được sử dụng',
        },
      });
    }

    // ===== CHECK PHONE NUMBER =====
    const phoneExists = await this.users.findDeviceByPhone(data.phoneNumber);
    if (phoneExists) {
      throw new BadRequestException({
        success: false,
        message: 'Số điện thoại đã tồn tại',
        errors: {
          field: 'phoneNumber',
          detail: 'SĐT này đã thuộc về một thiết bị khác',
        },
      });
    }

    // ===== CREATE USER =====
    const user = await this.users.create({
      full_name: data.fullName,
      email: data.email,
      address: data.address,
      citizen_id: data.citizenId,
    });

    // ===== GENERATE API KEY =====
    const apiKey = this.generateApiKey();

    // ===== CREATE DEVICE =====
    const device = await this.users.createDevice({
      user_id: user.id,
      phone_number: data.phoneNumber,
      model: data.device.model,
      type: data.device.type,
      device_os: data.device.os,
      api_key: apiKey,
    });

    // ===== SUCCESS RESPONSE =====
    return {
      success: true,
      message: 'Đăng ký thành công!',
      data: {
        userId: user.id,
        deviceId: device.id,
        apiKey, // trả về cho thiết bị
      },
    };
  }
}
