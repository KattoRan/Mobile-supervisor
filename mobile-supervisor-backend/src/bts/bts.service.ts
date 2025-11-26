import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class BtsService {
  private readonly apiUrl = 'https://us1.unwiredlabs.com/v2/process.php';
  private readonly logger = new Logger(BtsService.name);
  private readonly API_KEY = process.env.OPENCELLID_API_KEY;

  constructor(private prisma: PrismaService) {}

  async getOrFetchStation(
    mcc: number,
    mnc: number,
    lac: number,
    cid: number,
    radio: string = 'lte',
  ) {
    // 1. Check cache trong DB
    const existingStation = await this.prisma.bts_stations.findUnique({
      where: {
        unique_cell_id: { mcc, mnc, lac, cid },
      },
    });

    if (existingStation) {
      return existingStation;
    }

    // 2. Payload API đúng chuẩn Unwired Labs
    const payload = {
      token: this.API_KEY,
      radio,
      mcc,
      mnc,
      cells: [
        {
          lac,
          cid,
        },
      ],
      address: 1,
    };

    try {
      // 3. Gọi API Unwired Labs
      const response = await axios.post(this.apiUrl, payload);
      const data = response.data;

      this.logger.debug('API response: ' + JSON.stringify(data));

      if (data.status === 'ok' && data.lat && data.lon) {
        // 4. Lưu vào DB
        const newStation = await this.prisma.bts_stations.create({
          data: {
            mcc,
            mnc,
            lac,
            cid,
            lat: data.lat,
            lon: data.lon,
            radio: radio,
            range: data.accuracy || data.range || 0,
            address: data.address || '',
          },
        });

        return newStation;
      } else {
        this.logger.warn(`API không trả về tọa độ: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      this.logger.error(
        `Lỗi khi gọi API Unwired Labs: ${mcc}-${mnc}-${lac}-${cid}`,
        error?.message,
      );
    }

    return null;
  }

  async getAllStoredStations() {
    return this.prisma.bts_stations.findMany();
  }
}
