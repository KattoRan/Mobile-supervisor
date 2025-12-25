import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BtsService } from '../bts/bts.service';
import { EventsGateway } from '../events/events.gateway';
import PQueue from 'p-queue';

@Injectable()
export class DataService {
  // Queue giới hạn số BTS lookup chạy song song
  private readonly btsQueue = new PQueue({ concurrency: 2 });

  constructor(
    private readonly prisma: PrismaService,
    private readonly btsService: BtsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async saveData(deviceId: string, dto: any) {
    if (!dto?.location) {
      throw new BadRequestException('Missing location data');
    }

    const { location } = dto;
    const cellTowers = Array.isArray(dto.cellTowers) ? dto.cellTowers : [];
    const now = new Date();

    // =========================
    // 1️⃣ LƯU GPS LOCATION
    // =========================
    await this.prisma.location_history.create({
      data: {
        latitude: location.latitude,
        longitude: location.longitude,
        recorded_at: now,
        device_id: deviceId,
      },
    });

    // =========================
    // 2️⃣ LƯU CELL TOWER HISTORY
    // =========================
    if (cellTowers.length > 0) {
      await this.prisma.cell_tower_history.createMany({
        data: cellTowers.map((tower, index) => ({
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

          // Tower đầu tiên là Serving Cell
          is_serving: index === 0,
        })),
      });
    }

    // =========================
    // 3️⃣ SOCKET REALTIME
    // =========================
    const servingCell = cellTowers[0];

    this.eventsGateway.server.emit('device_moved', {
      deviceId,
      lat: location.latitude,
      lon: location.longitude,
      cid: servingCell?.cid,
      lac: servingCell?.lac,
      rssi: servingCell?.rssi ?? servingCell?.signalDbm,
      timestamp: now.toISOString(),
    });

    // =========================
    // 4️⃣ BTS LOOKUP (BACKGROUND + THROTTLE)
    // =========================
    this.lookupBtsInBackground(cellTowers);

    return {
      success: true,
      message: 'Data saved & broadcasted',
    };
  }

  // =========================
  // BTS LOOKUP QUEUED
  // =========================
  private lookupBtsInBackground(cellTowers: any[]) {
    for (const tower of cellTowers) {
      this.btsQueue.add(() =>
        this.btsService.getOrFetchStation(
          tower.mcc,
          tower.mnc,
          tower.lac,
          tower.cid,
          tower.type,
        ),
      );
    }
  }
}
