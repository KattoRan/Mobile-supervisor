import { Controller, Get, Query } from '@nestjs/common';
import { BtsService } from './bts.service';
import path from 'path';

@Controller('bts')
export class BtsController {
  constructor(private readonly btsService: BtsService) {}

  @Get()
  async getByBoundingBox(
    @Query('minLat') minLat: string,
    @Query('maxLat') maxLat: string,
    @Query('minLon') minLon: string,
    @Query('maxLon') maxLon: string,
  ) {
    return this.btsService.getByBoundingBox({
      minLat: Number(minLat),
      maxLat: Number(maxLat),
      minLon: Number(minLon),
      maxLon: Number(maxLon),
    });
  }

  @Get('import-csv')
  async importAndFill() {
    const filePath = path.join(process.cwd(), 'data/452.csv');
    const result = await this.btsService.importFromCsv(filePath);
    await this.btsService.fillMissingAddresses();
    return result;
  }

  @Get('fill-all-address')
  async fillAllAddresses() {
    let total = 0;

    while (true) {
      const { updated } = await this.btsService.fillMissingAddresses();

      if (updated === 0) break;

      total += updated;
    }

    return {
      message: 'Done updating all addresses',
      total,
    };
  }
}
