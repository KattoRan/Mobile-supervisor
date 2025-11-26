import { Module } from '@nestjs/common';
import { BtsModule } from 'src/bts/bts.module';
import { DataService } from './data.service';
import { EventsModule } from 'src/events/events.module';

@Module({
  imports: [BtsModule, EventsModule],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}
