import { Injectable, NotFoundException } from '@nestjs/common';
import { Device, PrismaClient } from '@prisma/client';
import { UpPositionDto } from './dto/up-position.dto';
import { PositionGateway } from '../realtime/position.gateway';

@Injectable()
export class IngestService {
  private prisma = new PrismaClient();
  private readonly minMoveMeters = +(process.env.INGEST_MIN_MOVE ?? 5);

  constructor(private readonly gateway: PositionGateway) {}

  async handlePosition(dto: UpPositionDto) {
    // 1) Resolve device theo deviceId hoặc phoneNumber (auto-create nếu có phoneNumber)
    let device: Device | null = null;

    if (dto.deviceId) {
      device = await this.prisma.device.findUnique({
        where: { id: dto.deviceId },
      });
    }

    if (!device && dto.phoneNumber) {
      // Vì phoneNumber là @unique => dùng upsert
      device = await this.prisma.device.upsert({
        where: { phoneNumber: dto.phoneNumber },
        update: { lastSeen: new Date(), isActive: true },
        create: {
          deviceCode: `AUTO-${dto.phoneNumber}`, // sinh mã tạm
          userName: dto.phoneNumber, // hoặc 'device-' + dto.phoneNumber.slice(-4)
          phoneNumber: dto.phoneNumber,
          lastSeen: new Date(),
          isActive: true,
          meta: {},
        },
      });
    }

    if (!device) {
      // Trường hợp không có cả deviceId lẫn phoneNumber trong DTO
      throw new NotFoundException(
        'Device not found (missing deviceId/phoneNumber)',
      );
    }

    // 2) Lọc theo khoảng cách (giảm rác dữ liệu)
    const last = await this.prisma.locationHistory.findFirst({
      where: { deviceId: device.id },
      orderBy: { timestamp: 'desc' },
      select: { latitude: true, longitude: true },
    });
    const ts = dto.isoTimestamp ? new Date(dto.isoTimestamp) : new Date();

    let shouldPersist = true;
    if (last) {
      const d = this.haversineMeters(
        last.latitude,
        last.longitude,
        dto.latitude,
        dto.longitude,
      );
      shouldPersist = d >= this.minMoveMeters;
    }

    // 3) Lưu DB (nếu di chuyển đủ xa), rồi phát WS
    if (shouldPersist) {
      await this.prisma.locationHistory.create({
        data: {
          deviceId: device.id,
          latitude: dto.latitude,
          longitude: dto.longitude,
          cid: dto.cid ?? null,
          lac: dto.lac ?? null,
          mcc: dto.mcc ?? null,
          mnc: dto.mnc ?? null,
          timestamp: ts,
        },
      });
    }

    this.gateway.broadcastPosition({
      deviceId: device.id,
      lat: dto.latitude,
      lng: dto.longitude,
      ts: ts.getTime(),
      userName: device.userName,
      phoneNumber: device.phoneNumber,
    });
  }

  private haversineMeters(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) {
    const R = 6371000,
      toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1),
      dLng = toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  }
}
