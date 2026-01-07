import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BtsService } from '../bts/bts.service';
import { EventsGateway } from '../events/events.gateway';
import PQueue from 'p-queue';
import axios from 'axios';

@Injectable()
export class DataService {
  // Queue giới hạn số BTS lookup chạy song song
  private readonly btsQueue = new PQueue({ concurrency: 2 });

  constructor(
    private readonly prisma: PrismaService,
    private readonly btsService: BtsService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  // =========================
  // REVERSE GEOCODE
  // =========================
  private async reverseGeocode(lat: string, lon: string): Promise<string> {
    try {
      const url = `https://us1.locationiq.com/v1/reverse?key=${process.env.LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json`;

      const res = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'MobileSupervisorApp/1.0',
        },
      });

      return res.data?.display_name || '';
    } catch (e: any) {
      console.log(`LocationIQ error for ${lat},${lon}: ${e.message}`);
      return '';
    }
  }

  // =========================
  // MAIN ENTRY
  // =========================
  async saveData(deviceId: string, dto: any) {
    console.time('TOTAL SAVE DATA');

    if (!dto?.location) {
      throw new BadRequestException('Missing location data');
    }

    const { location } = dto;
    const cellTowers = Array.isArray(dto.cellTowers) ? dto.cellTowers : [];
    const servingCell = cellTowers[0];

    // =========================
    // 1. SOCKET REALTIME - EMIT NGAY
    // =========================
    const emitTime = new Date();

    this.eventsGateway.server.emit('device_moved', {
      deviceId,
      lat: location.latitude,
      lon: location.longitude,
      cid: servingCell?.cid,
      lac: servingCell?.lac,
      rssi: servingCell?.rssi ?? servingCell?.signalDbm,
      timestamp: emitTime.toISOString(),
    });

    // =========================
    // 2. SAVE DB + GEOCODE BACKGROUND
    // =========================
    this.processSaveAndGeocode(deviceId, location, cellTowers);

    // =========================
    // 3. BTS LOOKUP BACKGROUND
    // =========================
    this.lookupBtsInBackground(cellTowers);

    console.timeEnd('TOTAL SAVE DATA');
    return {
      success: true,
      message: 'Data received & broadcasted',
    };
  }

  // =========================
  // BACKGROUND SAVE + GEOCODE
  // =========================
  private async processSaveAndGeocode(
    deviceId: string,
    location: any,
    cellTowers: any[],
  ) {
    console.time('SAVE DATA BACKGROUND');

    try {
      const now = new Date();

      // chạy geocode song song, KHÔNG block
      const addressPromise = await this.reverseGeocode(
        location.latitude,
        location.longitude,
      );

      // =========================
      // TRANSACTION SAVE
      // =========================
      await this.prisma.$transaction(async (tx) => {
        // LƯU GPS LOCATION
        await tx.location_history.create({
          data: {
            latitude: location.latitude,
            longitude: location.longitude,
            district: addressPromise,
            recorded_at: now,
            device_id: deviceId,
          },
        });

        // LƯU CELL TOWER HISTORY
        if (cellTowers.length > 0) {
          await tx.cell_tower_history.createMany({
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
              is_serving: index === 0,
            })),
          });
        }

        // UPDATE LAST SEEN
        await tx.devices.update({
          where: { id: deviceId },
          data: { last_seen: now },
        });
      });

      // =========================
      // UPDATE ADDRESS SAU
      // =========================
      // const address = await addressPromise;

      // if (address) {
      //   await this.prisma.location_history.updateMany({
      //     where: {
      //       device_id: deviceId,
      //       recorded_at: now,
      //     },
      //     data: {
      //       district: address,
      //     },
      //   });
      // }

      console.timeEnd('SAVE DATA BACKGROUND');
    } catch (err) {
      console.error('Background save/geocode error:', err);
    }
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
