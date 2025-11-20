import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class DeviceAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
      throw new UnauthorizedException('Thiếu accessToken');
    }

    try {
      const payload = this.jwt.verify(token);
      req.deviceId = payload.sub;
      req.userId = payload.userId;
      req.phoneNumber = payload.phoneNumber;
      return true;
    } catch (e) {
      throw new UnauthorizedException('Token không hợp lệ hoặc hết hạn');
    }
  }
}
