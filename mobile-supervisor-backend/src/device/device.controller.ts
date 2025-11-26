import { Controller, Get, Param, UseGuards, Query } from '@nestjs/common';
import { DeviceService } from './device.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('devices')
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  // devices.controller.ts
  @Get()
  @UseGuards(JwtAuthGuard)
  async getAllDevices(
    @Query('page') page: string,
    @Query('limit') limit: string,
  ) {
    const pageNum = Number(page) || 1;
    const limitNum = Number(limit) || 20;

    return this.deviceService.findAll(pageNum, limitNum);
  }

  // API cho Bản đồ chi tiết: GET /devices/:id
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getDeviceDetail(@Param('id') id: string) {
    return this.deviceService.findOne(id);
  }
}
