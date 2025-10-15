import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AdminUserService } from '../admin-user/admin-user.service';

@Injectable()
export class AuthService {
  constructor(
    private users: AdminUserService,
    private jwt: JwtService,
  ) {}

  async validateUser(email: string, password: string) {
    const u = await this.users.findByEmail(email);
    if (!u) throw new UnauthorizedException('Email không tồn tại');
    const ok = await bcrypt.compare(password, u.passwordHash);
    if (!ok) throw new UnauthorizedException('Sai mật khẩu');
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      role: (u as any).role ?? 'admin',
    };
  }

  async login(user: { id: string; email: string; name: string; role: string }) {
    const payload = {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
    const accessToken = await this.jwt.sign(payload);
    return { accessToken, user: payload };
  }
}
