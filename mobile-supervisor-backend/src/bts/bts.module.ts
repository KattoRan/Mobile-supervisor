import { Module } from '@nestjs/common';
import { BtsService } from './bts.service';
import { BtsController } from './bts.controller';

@Module({
  providers: [BtsService],
  exports: [BtsService],
  controllers: [BtsController],
})
export class BtsModule {}
