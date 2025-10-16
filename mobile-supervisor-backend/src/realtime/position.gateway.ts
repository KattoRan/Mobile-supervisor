import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
} from '@nestjs/websockets';
import { Server } from 'socket.io';

export type LivePosition = {
  deviceId: string;
  lat: number;
  lng: number;
  ts: number;
  userName?: string;
  phoneNumber?: string;
};

@WebSocketGateway({ namespace: '/realtime', cors: { origin: '*' } })
export class PositionGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;

  handleConnection() {
    /* option: emit snapshot */
  }

  broadcastPosition(p: LivePosition) {
    this.server.emit('position', p);
  }

  broadcastSnapshot(list: LivePosition[]) {
    this.server.emit('snapshot', list);
  }
}
