import { Module } from '@nestjs/common';
import { IngestService } from './ingest.service';
import { PositionGateway } from '../realtime/position.gateway';

@Module({
  imports: [],
  providers: [IngestService, PositionGateway],
  exports: [IngestService, PositionGateway],
})
export class IngestModule {}
