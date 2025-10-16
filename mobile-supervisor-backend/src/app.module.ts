import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AdminUserModule } from './admin-user/admin-user.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/jwt.guard';
import { IngestController } from './ingest/ingest.controller';
import { IngestService } from './ingest/ingest.service';
import { IngestModule } from './ingest/ingest.module';

@Module({
  imports: [PrismaModule, AdminUserModule, AuthModule, IngestModule],
  controllers: [AppController, IngestController],
  providers: [AppService, { provide: APP_GUARD, useClass: JwtAuthGuard }, IngestService],
})
export class AppModule {}
