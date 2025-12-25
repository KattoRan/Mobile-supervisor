import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataService } from '../data/data.service';
import * as mqtt from 'mqtt';

@Injectable()
export class MqttService implements OnModuleInit, OnModuleDestroy {
  private client: mqtt.MqttClient;

  constructor(
    private readonly configService: ConfigService,
    private readonly dataService: DataService,
  ) {}

  onModuleInit() {
    const host = this.configService.get<string>('MQTT_HOST');
    const port = this.configService.get<number>('MQTT_PORT') ?? 8883;
    const username = this.configService.get<string>('MQTT_USER');
    const password = this.configService.get<string>('MQTT_PASS');

    if (!host || !username || !password) {
      console.error('Missing MQTT config (HOST / USER / PASS)');
      return;
    }

    const url = `mqtts://${host}:${port}`;

    this.client = mqtt.connect(url, {
      // AUTH
      username,
      password,

      // CLIENT ID (BẮT BUỘC DUY NHẤT)
      clientId: `nestjs_${Date.now()}_${Math.random().toString(16).slice(2)}`,

      // RECONNECT
      clean: true,
      reconnectPeriod: 1000,

      // TLS
      // HiveMQ Cloud dùng CA public → Node.js OK sẵn
      // Nếu gặp lỗi TLS thì bật dòng dưới để test
      rejectUnauthorized: false,
    });

    this.client.on('connect', () => {
      console.log('Connected to HiveMQ Cloud');

      this.client.subscribe('cell_info', { qos: 0 }, (err) => {
        if (err) {
          console.error('Subscribe error:', err.message);
        } else {
          console.log('Subscribed topic: cell_info');
        }
      });
    });

    this.client.on('message', async (topic, message) => {
      if (topic !== 'cell_info') return;

      try {
        const payload = JSON.parse(message.toString());

        /**
         * payload TỪ THIẾT BỊ PHẢI CÓ:
         * {
         *   deviceId: "xxx",
         *   location: { latitude, longitude },
         *   cellTowers: [...]
         * }
         */

        const deviceId = payload.deviceId;
        if (!deviceId) {
          console.warn('MQTT payload missing deviceId');
          return;
        }
        console.log('Payload', payload);
        await this.dataService.saveData(deviceId, payload);
      } catch (err) {
        console.error('Invalid MQTT payload:', err.message);
      }
    });

    this.client.on('reconnect', () => {
      console.log('MQTT reconnecting...');
    });

    this.client.on('error', (err) => {
      console.error('MQTT error:', err.message);
    });

    this.client.on('close', () => {
      console.warn('MQTT connection closed');
    });
  }

  publish(topic: string, message: string | object) {
    if (!this.client?.connected) {
      console.warn('MQTT not connected');
      return;
    }

    const payload =
      typeof message === 'string' ? message : JSON.stringify(message);

    this.client.publish(topic, payload, { qos: 0 }, (err) => {
      if (err) {
        console.error('Publish error:', err.message);
      }
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.end(true, () => {
        console.log('MQTT disconnected');
      });
    }
  }
}
