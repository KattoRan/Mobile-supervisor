import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BtsService } from '../bts/bts.service';
import { EventsGateway } from '../events/events.gateway';

@Injectable()
export class DataService {
  constructor(
    private prisma: PrismaService,
    private btsService: BtsService,
    private eventsGateway: EventsGateway,
  ) {}

  async saveData(deviceId: string, dto: any) {
    if (!dto?.location) {
      throw new BadRequestException('Missing location data');
    }

    const { location } = dto;
    const cellTowers = Array.isArray(dto.cellTowers) ? dto.cellTowers : [];
    const now = new Date();

    // --- BƯỚC 1: LƯU DATABASE ---
    await this.prisma.$transaction(async (tx) => {
      // 1. Lưu vị trí GPS
      await tx.location_history.create({
        data: {
          latitude: location.latitude,
          longitude: location.longitude,
          recorded_at: now,
          device: {
            connect: { id: deviceId },
          },
        },
      });

      // 2. Lưu danh sách Cell Towers
      if (cellTowers.length > 0) {
        const towersData = cellTowers.map((tower, index) => ({
          device_id: deviceId,
          type: tower.type,
          mcc: tower.mcc,
          mnc: tower.mnc,
          lac: tower.lac,
          cid: tower.cid,
          rssi: tower.rssi ?? null,
          signal_dbm: tower.signalDbm ?? null,
          pci: tower.pci ?? null,
          recorded_at: now,

          // QUAN TRỌNG: Phần tử đầu tiên (index 0) là Serving Cell
          is_serving: index === 0,
        }));

        await tx.cell_tower_history.createMany({
          data: towersData,
          skipDuplicates: true,
        });
      }
    });

    // --- BƯỚC 2: BẮN SOCKET REALTIME ---
    // Chỉ lấy Serving Cell (index 0) để vẽ dây nối trên bản đồ
    const servingCell = cellTowers.length > 0 ? cellTowers[0] : null;

    this.eventsGateway.server.emit('device_moved', {
      deviceId: deviceId,
      lat: location.latitude,
      lon: location.longitude,

      // Gửi thông tin Serving Cell để Frontend vẽ đường nối
      cid: servingCell?.cid,
      lac: servingCell?.lac,
      rssi: servingCell?.rssi ?? servingCell?.signalDbm, // Ưu tiên lấy RSSI hoặc dBm

      timestamp: now.toISOString(),
    });

    // --- BƯỚC 3: TRA CỨU BTS (Background) ---
    // Vẫn lookup tất cả (cả serving và neighbor) để làm giàu dữ liệu bản đồ
    if (cellTowers.length > 0) {
      Promise.allSettled(
        cellTowers.map((tower) =>
          this.btsService.getOrFetchStation(
            tower.mcc,
            tower.mnc,
            tower.lac,
            tower.cid,
            tower.type,
          ),
        ),
      ).catch((err) => console.error('Lỗi cập nhật BTS:', err));
    }

    return { success: true, message: 'Data saved & broadcasted' };
  }
}
