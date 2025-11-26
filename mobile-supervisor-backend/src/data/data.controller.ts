import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { SubmitDataDto } from './dto/submit-data.dto';
import { DataService } from './data.service';
import { ApiKeyGuard } from '../auth/api-key.guard';

@Controller('data')
export class DataController {
  constructor(private data: DataService) {}

  @Post('submit')
  @UseGuards(ApiKeyGuard)
  async submit(@Req() req, @Body() data: SubmitDataDto) {
    const deviceId = req.deviceId;

    await this.data.saveData(deviceId, data);

    return {
      success: true,
      message: 'Dữ liệu đã được ghi nhận.',
    };
  }
}
