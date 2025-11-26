// src/events/events.gateway.ts
import {
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Socket, Server } from 'socket.io';
import { PrismaService } from 'src/prisma/prisma.service';

@WebSocketGateway({
  cors: {
    origin: '*', // Cho phép React kết nối
  },
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  constructor(private prisma: PrismaService) {}

  // 1. Nhận dữ liệu vị trí từ thiết bị (hoặc script giả lập)
  @SubscribeMessage('send_location')
  async handleLocation(client: Socket, payload: any) {
    // payload: { deviceId, lat, lon, mcc, mnc, lac, cid, rssi ... }

    // A. Bắn ngay lập tức xuống Frontend để hiển thị Realtime (Không chờ DB)
    this.server.emit('device_moved', payload);

    // B. Lưu vào DB (Chạy ngầm - Fire & Forget để không delay)
    this.saveLocationToDb(payload);
  }

  async saveLocationToDb(data: any) {
    // Logic lưu vào location_history và cell_tower_history
    // ... code prisma create ...
    console.log(`Đã lưu log cho thiết bị: ${data.deviceId}`);
  }

  afterInit(server: Server) {
    console.log('Socket Gateway đã khởi động');
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }

  handleConnection(client: Socket, ...args: any[]) {
    console.log(`Client connected: ${client.id}`);
  }
}
