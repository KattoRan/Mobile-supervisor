import { Module } from '@nestjs/common';
import { BtsService } from './bts.service';

@Module({
  providers: [BtsService],
  exports: [BtsService],
})
export class BtsModule {}
