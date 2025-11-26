import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BtsService } from '../bts/bts.service';
import { EventsGateway } from '../events/events.gateway'; // Import Gateway

@Injectable()
export class DataService {
  constructor(
    private prisma: PrismaService,
    private btsService: BtsService,
    private eventsGateway: EventsGateway, // 1. Inject Gateway
  ) {}

  async saveData(deviceId: string, dto: any) {
    if (!dto?.location) {
      throw new BadRequestException('Missing location data');
    }

    // Nếu cellTowers không có hoặc rỗng, vẫn cho phép lưu vị trí (GPS only)
    const cellTowers = Array.isArray(dto.cellTowers) ? dto.cellTowers : [];
    const { location } = dto;
    const now = new Date();

    // --- BƯỚC 1: LƯU DATABASE (Giữ nguyên logic của bạn) ---
    await this.prisma.$transaction(async (tx) => {
      // Lưu vị trí
      await tx.location_history.create({
        data: {
          device_id: deviceId,
          latitude: location.latitude,
          longitude: location.longitude,
          recorded_at: now,
        },
      });

      if (cellTowers.length > 0) {
        const towersData = cellTowers.map((tower) => ({
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
        }));

        await tx.cell_tower_history.createMany({
          data: towersData,
          skipDuplicates: true,
        });
      }
    });

    // --- BƯỚC 2: BẮN SOCKET REALTIME CHO FRONTEND ---
    // Lấy trạm BTS chính (Serving Cell) để vẽ dây nối trên bản đồ
    // Thường là phần tử đầu tiên trong mảng hoặc trạm có signal tốt nhất
    const servingCell = cellTowers.length > 0 ? cellTowers[0] : null;

    this.eventsGateway.server.emit('device_moved', {
      deviceId: deviceId,
      lat: location.latitude,
      lon: location.longitude,
      // Gửi thông tin trạm đang kết nối để Frontend vẽ đường kẻ
      cid: servingCell?.cid,
      lac: servingCell?.lac,
      rssi: servingCell?.rssi,
      timestamp: now.toISOString(),
    });

    // --- BƯỚC 3: TRA CỨU & LƯU THÔNG TIN TRẠM BTS (CHẠY NGẦM) ---
    // Logic này giữ nguyên để làm giàu dữ liệu cho lần sau
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
