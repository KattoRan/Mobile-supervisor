import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import axios from 'axios';
import * as fs from 'fs';
import csv from 'csv-parser';
import Bottleneck from 'bottleneck';

interface BTSRecord {
  mcc: number;
  mnc: number;
  lac: number;
  cid: number;
  lat: string;
  lon: string;
  radio: string;
  range: number;
}

@Injectable()
export class BtsService {
  private readonly apiUrl = 'https://us1.unwiredlabs.com/v2/process.php';
  private readonly logger = new Logger(BtsService.name);
  private readonly API_KEY = process.env.OPENCELLID_API_KEY;

  constructor(private prisma: PrismaService) {}

  /**
   * Lấy hoặc fetch 1 cell duy nhất bằng API UnwiredLabs
   */
  async getOrFetchStation(
    mcc: number,
    mnc: number,
    lac: number,
    cid: number,
    radio: string = 'lte',
  ) {
    const existing = await this.prisma.bts_stations.findUnique({
      where: { unique_cell_id: { mcc, mnc, lac, cid } },
    });

    if (existing) return existing;

    const payload = {
      token: this.API_KEY,
      radio,
      mcc,
      mnc,
      cells: [{ lac, cid }],
      address: 1,
    };

    try {
      const response = await axios.post(this.apiUrl, payload);
      const data = response.data;

      if (data.status === 'ok' && data.lat && data.lon) {
        return await this.prisma.bts_stations.create({
          data: {
            mcc,
            mnc,
            lac,
            cid,
            lat: data.lat,
            lon: data.lon,
            radio,
            range: data.accuracy || data.range || 0,
            address: data.address || '',
          },
        });
      }
    } catch (error) {
      this.logger.error(
        `API error: ${mcc}-${mnc}-${lac}-${cid} => ${error?.message}`,
      );
    }

    return null;
  }

  /**
   * Lấy toàn bộ trạm hiện có
   */
  async getAllStoredStations() {
    return this.prisma.bts_stations.findMany();
  }

  /**
   * IMPORT CSV NHANH — Batch Insert
   */
  async importFromCsv(filePath: string) {
    return new Promise((resolve, reject) => {
      const HANOI_BBOX = {
        minLat: 20.55,
        maxLat: 21.55,
        minLon: 105.25,
        maxLon: 106.05,
      };

      let total = 0;
      let skipped = 0;
      let inserted = 0;

      const batch: BTSRecord[] = [];
      const BATCH_SIZE = 1000;

      this.logger.log(`🚀 Bắt đầu import CSV: ${filePath}`);

      const stream = fs.createReadStream(filePath).pipe(
        csv({
          headers: [
            'radio',
            'mcc',
            'mnc',
            'lac',
            'cellid',
            'unit',
            'lon',
            'lat',
            'range',
            'samples',
            'changeable',
            'created',
            'updated',
            'averageSignal',
          ],
        }),
      );

      const insertBatch = async () => {
        if (batch.length === 0) return;

        const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

        const values = batch
          .map(
            (b) =>
              `(${b.mcc},${b.mnc},${b.lac},${b.cid},'${b.lat}','${b.lon}','${b.radio}',${b.range},'', '${now}', '${now}')`,
          )
          .join(',');

        const sql = `
    INSERT INTO bts_stations 
    (\`mcc\`, \`mnc\`, \`lac\`, \`cid\`, \`lat\`, \`lon\`, \`radio\`, \`range\`, \`address\`, \`created_at\`, \`updated_at\`)
    VALUES ${values}
    ON DUPLICATE KEY UPDATE \`cid\` = \`cid\`;
  `;

        await this.prisma.$executeRawUnsafe(sql);
        inserted += batch.length;
        batch.length = 0;
      };

      stream
        .on('data', async (row) => {
          total++;

          const lat = parseFloat(row.lat);
          const lon = parseFloat(row.lon);

          if (isNaN(lat) || isNaN(lon)) {
            skipped++;
            return;
          }

          const inHanoi =
            lat >= HANOI_BBOX.minLat &&
            lat <= HANOI_BBOX.maxLat &&
            lon >= HANOI_BBOX.minLon &&
            lon <= HANOI_BBOX.maxLon;

          if (!inHanoi) {
            skipped++;
            return;
          }

          batch.push({
            mcc: Number(row.mcc),
            mnc: Number(row.mnc),
            lac: Number(row.lac),
            cid: Number(row.cellid),
            lat: lat.toString(),
            lon: lon.toString(),
            radio: row.radio,
            range: Number(row.range || 0),
          });

          if (batch.length >= BATCH_SIZE) {
            stream.pause();
            await insertBatch();
            stream.resume();
          }
        })
        .on('end', async () => {
          await insertBatch();

          this.logger.log(
            `🎉 Import xong! total=${total}, inserted=${inserted}, skipped=${skipped}`,
          );

          resolve({ total, inserted, skipped });
        })
        .on('error', (err) => {
          this.logger.error(`CSV error: ${err.message}`);
          reject(err);
        });
    });
  }

  /**
   * BỔ SUNG ADDRESS TỪ API (throttle tránh bị khóa API)
   */
  private async reverseGeocode(lat: string, lon: string): Promise<string> {
    try {
      const url = `https://us1.locationiq.com/v1/reverse?key=${process.env.LOCATIONIQ_KEY}&lat=${lat}&lon=${lon}&format=json`;

      const res = await axios.get(url, {
        timeout: 8000,
        headers: {
          'User-Agent': 'MobileSupervisorApp/1.0', // cần nhưng không khắt khe như Nominatim
        },
      });

      return res.data?.display_name || '';
    } catch (e) {
      this.logger.warn(`⚠️ LocationIQ error for ${lat},${lon}: ${e.message}`);
      return '';
    }
  }

  async fillMissingAddresses() {
    const stations = await this.prisma.bts_stations.findMany({
      where: { address: '' },
      take: 2000,
    });

    // this.logger.log(`📍 Đang cập nhật địa chỉ cho ${stations.length} cell...`);

    // Free tier LocationIQ: 2 request/giây
    const limiter = new Bottleneck({
      minTime: 500, // 1 request mỗi 500ms → 2 req/s
      maxConcurrent: 1, // chỉ 1 req một lúc để tránh burst
    });

    let updated = 0;

    const tasks = stations.map((s) =>
      limiter.schedule(async () => {
        try {
          const address = await this.reverseGeocode(
            s.lat.toString(),
            s.lon.toString(),
          );

          if (!address) return;

          await this.prisma.bts_stations.update({
            where: {
              unique_cell_id: {
                mcc: s.mcc,
                mnc: s.mnc,
                lac: s.lac,
                cid: s.cid,
              },
            },
            data: { address },
          });

          updated++;
        } catch (e) {
          this.logger.warn(
            `⚠️ LocationIQ error for ${s.lat},${s.lon}: ${e?.message}`,
          );
        }
      }),
    );

    await Promise.all(tasks);

    this.logger.log(`✅ Đã cập nhật thành công ${updated} địa chỉ`);

    return { updated };
  }

  async getByBoundingBox(params: {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
  }) {
    const { minLat, maxLat, minLon, maxLon } = params;

    // this.logger.log(
    //   `Fetching BTS in area: lat(${minLat}→${maxLat}), lon(${minLon}→${maxLon})`,
    // );

    return this.prisma.bts_stations.findMany({
      where: {
        lat: {
          gte: minLat,
          lte: maxLat,
        },
        lon: {
          gte: minLon,
          lte: maxLon,
        },
      },
      select: {
        id: true,
        lat: true,
        lon: true,
        mcc: true,
        mnc: true,
        lac: true,
        cid: true,
        radio: true,
      },
    });
  }
}
