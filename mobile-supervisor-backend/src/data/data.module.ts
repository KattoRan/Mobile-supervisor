import { forwardRef, Module } from '@nestjs/common';
import { BtsModule } from 'src/bts/bts.module';
import { DataService } from './data.service';
import { EventsModule } from 'src/events/events.module';
import { MqttModule } from 'src/mqtt/mqtt.module';

@Module({
  imports: [BtsModule, EventsModule, forwardRef(() => MqttModule)],
  providers: [DataService],
  exports: [DataService],
})
export class DataModule {}
