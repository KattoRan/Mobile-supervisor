import { Module, forwardRef } from '@nestjs/common';
import { MqttService } from './mqtt.service';
import { DataModule } from 'src/data/data.module';

@Module({
  imports: [
    forwardRef(() => DataModule), // 👈 QUAN TRỌNG
  ],
  providers: [MqttService],
  exports: [MqttService],
})
export class MqttModule {}
