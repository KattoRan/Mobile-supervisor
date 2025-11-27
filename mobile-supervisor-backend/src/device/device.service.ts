import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeviceService {
  constructor(private prisma: PrismaService) {}

  /**
   * API cho Bảng (Table): Lấy danh sách thiết bị
   */
  async findAll(page: number = 1, limit: number = 20) {
    const skip = (page - 1) * limit;
    const total = await this.prisma.devices.count();

    const devices = await this.prisma.devices.findMany({
      skip,
      take: limit,
      orderBy: { last_seen: 'desc' },
      include: {
        user: true,
        // Chỉ lấy vị trí mới nhất
        location_history: {
          orderBy: { recorded_at: 'desc' },
          take: 1,
        },
        // Chỉ lấy trạm BTS mới nhất
        cell_tower_history: {
          where: { is_serving: true },
          orderBy: { recorded_at: 'desc' },
          take: 1,
        },
      },
    });

    // Format dữ liệu gọn gàng cho Frontend
    const transformed = devices.map((device) => {
      const lastLoc = device.location_history[0];
      const lastCell = device.cell_tower_history[0];

      return {
        ...device,
        // Trả về object location đơn lẻ thay vì mảng
        last_location: lastLoc
          ? {
              latitude: Number(lastLoc.latitude),
              longitude: Number(lastLoc.longitude),
              recorded_at: lastLoc.recorded_at,
            }
          : null,

        // Trả về object cell đơn lẻ
        last_cell: lastCell
          ? {
              cid: lastCell.cid,
              lac: lastCell.lac,
              mcc: lastCell.mcc,
              mnc: lastCell.mnc,
              rssi: lastCell.rssi,
            }
          : null,

        // Xóa các trường thừa để payload nhẹ hơn
        location_history: undefined,
        cell_tower_history: undefined,
      };
    });

    return {
      data: transformed,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * API cho Bản đồ chi tiết (Map): Lấy trạng thái hiện tại
   */
  async findOne(id: string) {
    const device = await this.prisma.devices.findUnique({
      where: { id },
      include: {
        user: true,
        location_history: {
          orderBy: { recorded_at: 'desc' },
          take: 1, // Vị trí thì chỉ cần 1 cái mới nhất
        },
        // SỬA: Lấy nhiều hơn 1 để bao gồm cả Neighbor Cells trong cùng gói tin
        cell_tower_history: {
          orderBy: { recorded_at: 'desc' },
          take: 20,
        },
      },
    });

    if (!device) {
      throw new NotFoundException(`Không tìm thấy thiết bị: ${id}`);
    }

    // 1. Xử lý vị trí hiện tại
    const lastLocRaw = device.location_history[0];
    const currentLocation = lastLocRaw
      ? {
          latitude: Number(lastLocRaw.latitude),
          longitude: Number(lastLocRaw.longitude),
          recorded_at: lastLocRaw.recorded_at,
        }
      : null;

    // 2. Xử lý danh sách Cell Towers
    // Lấy timestamp của bản ghi mới nhất
    const latestTimestamp = device.cell_tower_history[0]?.recorded_at;

    // Lọc ra tất cả các cell thuộc về lần cập nhật mới nhất (cùng timestamp)
    const currentBatch = device.cell_tower_history.filter(
      (cell) => cell.recorded_at.getTime() === latestTimestamp?.getTime(),
    );

    const servingCellRaw =
      currentBatch.find((c) => c.is_serving) || currentBatch[0];

    // Neighbor là những cái còn lại
    const neighborCellsRaw = currentBatch.filter(
      (c) => c.id !== servingCellRaw?.id,
    );

    // 3. Lookup toạ độ Serving Cell (Trạm chính)
    let connectedStation: {
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
    if (servingCellRaw) {
      connectedStation = await this.lookupBtsStation(servingCellRaw);
    }

    const neighborStations: BtsStation[] = [];
    if (neighborCellsRaw.length > 0) {
      const results = await Promise.all(
        neighborCellsRaw.map((cell) => this.lookupBtsStation(cell)),
      );
      neighborStations.push(...results.filter((s) => s !== null));
    }

    return {
      ...device,
      current_location: currentLocation,
      connected_station: connectedStation,
      neighbor_stations: neighborStations,
      current_cell: servingCellRaw,
      location_history: undefined,
      cell_tower_history: undefined,
    };
  }

  private async lookupBtsStation(cell: any) {
    if (!cell?.cid || !cell?.lac || !cell?.mcc || !cell?.mnc) return null;

    const station = await this.prisma.bts_stations.findUnique({
      where: {
        unique_cell_id: {
          mcc: cell.mcc,
          mnc: cell.mnc,
          lac: cell.lac,
          cid: cell.cid,
        },
      },
    });

    if (station) {
      return {
        ...station,
        lat: Number(station.lat),
        lon: Number(station.lon),
      };
    }
    return null;
  }
}
type BtsStation = {
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
};
