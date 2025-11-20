import { Module } from '@nestjs/common';
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
  imports: [PrismaModule, UserModule, AuthModule],
  controllers: [AppController, DataController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }, DataService],
})
export class AppModule {}
