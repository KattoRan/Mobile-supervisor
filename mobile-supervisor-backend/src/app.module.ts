import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // <- thêm dòng này
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { DataService } from './data/data.service';
import { DataController } from './data/data.controller';
import { BtsService } from './bts/bts.service';
import { BtsModule } from './bts/bts.module';
import { DataModule } from './data/data.module';
import { DeviceModule } from './device/device.module';
import { EventsModule } from './events/events.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // <- làm global để có thể dùng ở tất cả module
    }),
    PrismaModule,
    UserModule,
    AuthModule,
    BtsModule,
    DataModule,
    DeviceModule,
    EventsModule,
    DashboardModule,
  ],
  controllers: [AppController, DataController],
  providers: [AppService, DataService, BtsService],
})
export class AppModule {}
