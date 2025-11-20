import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DataService {
  constructor(private prisma: PrismaService) {}

  async saveData(deviceId: string, dto: any) {
    const { location, cellTowers } = dto;

    // Lưu lịch sử vị trí
    await this.prisma.location_history.create({
      data: {
        device_id: deviceId,
        latitude: location.latitude,
        longitude: location.longitude,
        recorded_at: new Date(),
      },
    });

    // Lưu danh sách trạm phát sóng
    for (const tower of cellTowers) {
      await this.prisma.cell_tower_history.create({
        data: {
          device_id: deviceId,
          type: tower.type,
          mcc: tower.mcc,
          mnc: tower.mnc,
          lac: tower.lac,
          cid: tower.cid,
          rssi: tower.rssi,
          signal_dbm: tower.signalDbm,
          pci: tower.pci,
          recorded_at: new Date(),
        },
      });
    }

    return true;
  }
}
