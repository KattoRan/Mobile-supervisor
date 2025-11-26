import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeviceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lấy danh sách tất cả thiết bị để hiển thị lên Bảng (Table)
   * Bao gồm: Thông tin User, Vị trí mới nhất, Cell Tower mới nhất
   */
  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;

    // Tổng số thiết bị
    const total = await this.prisma.devices.count();

    const devices = await this.prisma.devices.findMany({
      skip,
      take: limit,

      orderBy: {
        last_seen: 'desc',
      },

      include: {
        user: true,

        location_history: {
          orderBy: { recorded_at: 'desc' },
          take: 1,
        },

        cell_tower_history: {
          orderBy: { recorded_at: 'desc' },
          take: 1,
        },
      },
    });

    // Format lại dữ liệu để frontend dễ dùng
    const transformed = devices.map((device) => {
      const lastLoc = device.location_history[0];
      const lastCell = device.cell_tower_history[0];

      return {
        ...device,

        location_history: lastLoc
          ? [
              {
                ...lastLoc,
                latitude: Number(lastLoc.latitude),
                longitude: Number(lastLoc.longitude),
              },
            ]
          : [],

        cell_tower_history: lastCell
          ? [
              {
                ...lastCell,
                pci: Number(lastCell.pci ?? 0),
                rssi: Number(lastCell.rssi ?? 0),
                signal_dbm: Number(lastCell.signal_dbm ?? 0),
              },
            ]
          : [],
      };
    });

    // Response format chuẩn infinite scroll
    return {
      data: transformed,
      page,
      limit,
      total,
      hasMore: page * limit < total,
    };
  }

  /**
   * Lấy chi tiết 1 thiết bị để vẽ Bản đồ (Map)
   * Bao gồm: User, 50 điểm lịch sử, Trạm BTS đang kết nối + Toạ độ trạm đó
   */
  async findOne(id: string) {
    const device = await this.prisma.devices.findUnique({
      where: { id },
      include: {
        user: true, // <--- LẤY THÔNG TIN NGƯỜI DÙNG

        // Lấy 50 điểm vị trí gần nhất
        location_history: {
          orderBy: { recorded_at: 'desc' },
          take: 50,
        },

        // Lấy thông tin trạm BTS đang kết nối
        cell_tower_history: {
          orderBy: { recorded_at: 'desc' },
          take: 1,
        },
      },
    });

    if (!device) {
      throw new NotFoundException(`Không tìm thấy thiết bị với ID: ${id}`);
    }

    // 1. Đảo ngược mảng lịch sử: Để vẽ từ Quá khứ -> Hiện tại (Frontend vẽ Polyline cần thứ tự này)
    // Đồng thời convert Decimal sang Number
    const formattedHistory = device.location_history
      .map((loc) => ({
        ...loc,
        latitude: Number(loc.latitude),
        longitude: Number(loc.longitude),
      }))
      .reverse(); // Đảo ngược mảng

    // 2. Tìm toạ độ của trạm BTS đang kết nối (nếu có)
    // Để frontend vẽ đường nối từ Thiết bị -> Trạm BTS
    let currentStationInfo: {
      id: number;
      lat: number;
      lon: number;
      address: string | null;
      created_at: Date;
      mcc: number;
      mnc: number;
      lac: number;
      cid: number;
      radio: string | null;
      range: number | null;
      updated_at: Date;
    } | null = null;
    const currentCell = device.cell_tower_history[0];

    if (
      currentCell &&
      currentCell.mcc &&
      currentCell.mnc &&
      currentCell.lac &&
      currentCell.cid
    ) {
      const station = await this.prisma.bts_stations.findUnique({
        where: {
          unique_cell_id: {
            mcc: currentCell.mcc,
            mnc: currentCell.mnc,
            lac: currentCell.lac,
            cid: currentCell.cid,
          },
        },
      });

      if (station) {
        currentStationInfo = {
          ...station,
          lat: Number(station.lat),
          lon: Number(station.lon),
        };
      }
    }

    // 3. Trả về object kết quả đã được làm đẹp
    return {
      ...device,
      location_history: formattedHistory, // Mảng toạ độ chuẩn cho Polyline
      connected_station: currentStationInfo, // Toạ độ trạm BTS (nếu tìm thấy trong DB)
      current_cell: currentCell, // Thông tin raw của sóng (RSSI, dBm...)
    };
  }
}
