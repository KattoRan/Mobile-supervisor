import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  /**
   * Lấy tổng quan dashboard
   */
  async getOverview() {
    // 1. Đếm tổng số thiết bị
    const totalDevices = await this.prisma.devices.count();

    // 2. Đếm thiết bị active (có hoạt động trong 5 phút)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const activeDevices = await this.prisma.devices.count({
      where: {
        last_seen: {
          gte: fiveMinutesAgo,
        },
      },
    });

    // 3. Thiết bị offline
    const offlineDevices = totalDevices - activeDevices;

    // 4. Tổng số người dùng
    const totalUsers = await this.prisma.users.count();

    // 5. Tổng số BTS stations
    const activeBTS = await this.prisma.bts_stations.count();

    // 6. Cảnh báo (thiết bị có tín hiệu yếu)
    const alerts = await this.prisma.cell_tower_history.count({
      where: {
        rssi: {
          lt: -100, // Tín hiệu yếu hơn -100 dBm
        },
        recorded_at: {
          gte: fiveMinutesAgo,
        },
      },
    });

    // 7. Trạng thái thiết bị
    const devicesByStatus = [
      { status: 'Hoạt động', count: activeDevices, color: '#10b981' },
      { status: 'Offline', count: offlineDevices, color: '#ef4444' },
    ];

    // 8. Chất lượng tín hiệu (5 phút gần nhất)
    const signalStats = await this.getSignalQualityStats(fiveMinutesAgo);

    // 9. Top locations
    const topLocations = await this.getTopLocations();

    return {
      summary: {
        totalDevices,
        activeDevices,
        offlineDevices,
        totalUsers,
        activeBTS,
        alerts,
      },
      devicesByStatus,
      signalQuality: signalStats,
      topLocations,
    };
  }

  /**
   * Lấy hoạt động gần đây
   */
  async getRecentActivities(limit: number = 10) {
    // Lấy location history gần nhất
    const recentLocations = await this.prisma.location_history.findMany({
      take: limit,
      orderBy: { recorded_at: 'desc' },
      include: {
        device: {
          include: {
            user: true,
          },
        },
      },
    });

    // Format activities
    const activities = recentLocations.map((location) => {
      const timeDiff = Date.now() - location.recorded_at.getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);

      let timeText = '';
      if (minutesAgo < 1) timeText = 'Vừa xong';
      else if (minutesAgo < 60) timeText = `${minutesAgo} phút trước`;
      else if (minutesAgo < 1440)
        timeText = `${Math.floor(minutesAgo / 60)} giờ trước`;
      else timeText = `${Math.floor(minutesAgo / 1440)} ngày trước`;

      return {
        id: location.id,
        device: location.device.model || 'Unknown Device',
        user: location.device.user?.full_name || 'Unknown User',
        action: 'Di chuyển',
        location: `${location.latitude.toNumber()}, ${location.longitude.toNumber()}`,
        time: timeText,
        type: 'move',
        timestamp: location.recorded_at,
      };
    });

    // Lấy cảnh báo tín hiệu yếu
    const weakSignals = await this.prisma.cell_tower_history.findMany({
      where: {
        rssi: { lt: -100 },
        recorded_at: {
          gte: new Date(Date.now() - 30 * 60 * 1000), // 30 phút
        },
      },
      take: 5,
      orderBy: { recorded_at: 'desc' },
      include: {
        device: {
          include: { user: true },
        },
      },
    });

    const alerts = weakSignals.map((signal) => {
      const timeDiff = Date.now() - signal.recorded_at.getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);
      const timeText = minutesAgo < 1 ? 'Vừa xong' : `${minutesAgo} phút trước`;

      return {
        id: `alert-${signal.id}`,
        device: signal.device.model || 'Unknown Device',
        user: signal.device.user?.full_name || 'Unknown User',
        action: 'Tín hiệu yếu',
        location: `CID: ${signal.cid}`,
        time: timeText,
        type: 'alert',
        timestamp: signal.recorded_at,
      };
    });

    // Merge và sort
    const combined = [...activities, ...alerts].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime(),
    );

    return combined.slice(0, limit);
  }

  /**
   * Thống kê chất lượng tín hiệu
   */
  private async getSignalQualityStats(since: Date) {
    // Lấy tất cả cell tower history gần đây
    const signals = await this.prisma.cell_tower_history.findMany({
      where: {
        recorded_at: { gte: since },
        is_serving: true, // Chỉ lấy serving cell
      },
      select: { rssi: true },
    });

    // Phân loại
    const excellent = signals.filter(
      (s) => s.rssi && s.rssi !== null && s.rssi >= -70,
    ).length;
    const good = signals.filter(
      (s) => s.rssi && s.rssi !== null && s.rssi < -70 && s.rssi >= -85,
    ).length;
    const fair = signals.filter(
      (s) => s.rssi && s.rssi !== null && s.rssi < -85 && s.rssi >= -100,
    ).length;
    const poor = signals.filter(
      (s) => s.rssi && s.rssi !== null && s.rssi < -100,
    ).length;

    const total = signals.length || 1; // Tránh chia cho 0

    return [
      {
        range: 'Xuất sắc (-50 đến -70 dBm)',
        count: excellent,
        percentage: Math.round((excellent / total) * 100),
        color: '#10b981',
      },
      {
        range: 'Tốt (-70 đến -85 dBm)',
        count: good,
        percentage: Math.round((good / total) * 100),
        color: '#3b82f6',
      },
      {
        range: 'Trung bình (-85 đến -100 dBm)',
        count: fair,
        percentage: Math.round((fair / total) * 100),
        color: '#f59e0b',
      },
      {
        range: 'Yếu (< -100 dBm)',
        count: poor,
        percentage: Math.round((poor / total) * 100),
        color: '#ef4444',
      },
    ];
  }

  /**
   * Top locations
   */
  private async getTopLocations() {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);

    const raw = await this.prisma.location_history.findMany({
      where: {
        recorded_at: { gte: fiveMinutesAgo },
        district: { not: null },
      },
      select: {
        district: true,
        device_id: true,
      },
    });

    // Khử trùng lặp device theo district
    const map = new Map<string, Set<string>>();

    for (const row of raw) {
      if (!row.district) continue; // chặn null

      if (!map.has(row.district)) {
        map.set(row.district, new Set());
      }

      map.get(row.district)!.add(row.device_id);
    }

    const result = Array.from(map.entries())
      .map(([district, devicesSet]) => ({
        district,
        devices: devicesSet.size,
      }))
      .sort((a, b) => b.devices - a.devices)
      .slice(0, 5);

    const max = result[0]?.devices || 1;

    return result.map((item) => ({
      ...item,
      percentage: Math.round((item.devices / max) * 100),
    }));
  }

  /**
   * Thống kê theo thời gian
   */
  async getStats(period: string) {
    let since: Date;
    const now = new Date();

    switch (period) {
      case 'today':
        since = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        since = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        since = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        since = new Date(now.setHours(0, 0, 0, 0));
    }

    // Hoạt động theo giờ
    const hourlyActivity = await this.prisma.location_history.groupBy({
      by: ['recorded_at'],
      where: {
        recorded_at: { gte: since },
      },
      _count: true,
    });

    // Group by hour
    const hourCounts: Record<string, number> = {};
    hourlyActivity.forEach((item) => {
      const hour = new Date(item.recorded_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + item._count;
    });

    const hourlyData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      count: hourCounts[i] || 0,
    }));

    return {
      period,
      hourlyActivity: hourlyData,
    };
  }
}
