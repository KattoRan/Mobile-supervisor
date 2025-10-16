import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { UpPositionDto } from './dto/up-position.dto';
import { IngestService } from './ingest.service';
import { Public } from '../auth/public.decorator';

@Controller('ingest')
export class IngestController {
  constructor(private readonly svc: IngestService) {}
  @Post('position')
  @HttpCode(204)
  @Public()
  async upPosition(@Body() dto: UpPositionDto) {
    await this.svc.handlePosition(dto);
  }
}
