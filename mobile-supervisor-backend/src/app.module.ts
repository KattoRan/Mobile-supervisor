import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // <- thêm dòng này
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt.guard';
import { UserModule } from './user/user.module';
import { DataService } from './data/data.service';
import { DataController } from './data/data.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // <- làm global để có thể dùng ở tất cả module
    }),
    PrismaModule,
    UserModule,
    AuthModule,
  ],
  controllers: [AppController, DataController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    DataService,
  ],
})
export class AppModule {}
