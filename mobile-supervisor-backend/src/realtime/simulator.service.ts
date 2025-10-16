import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { interval, Subscription } from 'rxjs';
import { randomInt } from 'crypto';
import { PositionGateway } from './position.gateway';

type DeviceState = { lat: number; lng: number };
const metersPerDegLat = 111_320;

@Injectable()
export class SimulatorService implements OnModuleInit, OnModuleDestroy {
  private sub?: Subscription;
  private readonly enabled = process.env.SIM_ENABLED === 'true'; // ENV
  private readonly tickMs = +(process.env.SIM_TICK_MS ?? 1000);
  private readonly stepMeters = +(process.env.SIM_STEP_METERS ?? 12);
  private readonly devices = new Map<string, DeviceState>();

  constructor(private readonly gateway: PositionGateway) {}

  onModuleInit() {
    if (!this.enabled) return;
    const N = +(process.env.SIM_NUM_DEVICES ?? 3);
    const start = {
      lat: +(process.env.SIM_START_LAT ?? 10.776889),
      lng: +(process.env.SIM_START_LNG ?? 106.700806),
    };
    for (let i = 1; i <= N; i++)
      this.devices.set(`device-${String(i).padStart(2, '0')}`, { ...start });

    this.sub = interval(this.tickMs).subscribe(() => this.tick());
  }
  onModuleDestroy() {
    this.sub?.unsubscribe();
  }

  private tick() {
    for (const [id, pos] of this.devices) {
      const next = this.randomWalk(pos);
      this.devices.set(id, next);
      this.gateway.broadcastPosition({
        deviceId: id,
        lat: next.lat,
        lng: next.lng,
        ts: Date.now(),
      });
    }
  }

  private randomWalk(pos: DeviceState): DeviceState {
    const metersPerDegLng = 111_320 * Math.cos((pos.lat * Math.PI) / 180);
    const dir = (randomInt(0, 360) * Math.PI) / 180;
    const dx = this.stepMeters * Math.cos(dir);
    const dy = this.stepMeters * Math.sin(dir);
    return {
      lat: pos.lat + dy / metersPerDegLat,
      lng: pos.lng + dx / metersPerDegLng,
    };
  }
}
