import { Controller, Get, UseGuards, Query } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from 'src/auth/jwt.guard';

@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview')
  @UseGuards(JwtAuthGuard)
  async getOverview() {
    return this.dashboardService.getOverview();
  }

  @Get('activities')
  @UseGuards(JwtAuthGuard)
  async getRecentActivities(@Query('limit') limit: string) {
    const limitNum = Number(limit) || 10;
    return this.dashboardService.getRecentActivities(limitNum);
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard)
  async getStats(@Query('period') period: string) {
    return this.dashboardService.getStats(period || 'today');
  }
}
