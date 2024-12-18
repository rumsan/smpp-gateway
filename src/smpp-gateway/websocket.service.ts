import { Logger } from '@nestjs/common';
import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({ cors: true })
export class WebSocketService
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(WebSocketService.name);

  @WebSocketServer()
  private server: Server;

  private readonly apiKey = process.env.API_KEY;

  async handleConnection(client: Socket) {
    const apiKey = client.handshake.query.apiKey as string;
    // Authenticate the API key
    if (apiKey !== this.apiKey) {
      this.server.emit('unauthorized', 'Invalid API key');
      client.disconnect(); // Disconnect the client if the API key is invalid
      //throw new WsException('Invalid API key'); // Optionally throw an error
    } else {
      this.logger.log(`Client connected: ${client.id}`);
      this.server.emit('welcome', 'Welcome to SMS Server');
    }
  }

  // Handling client disconnections
  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  handleMessage(@MessageBody() data: string): string {
    this.logger.log('Received message:', data);
    return `Echo: ${data}`;
  }

  // Broadcast message to all connected clients
  broadcast(event: string, message: any): void {
    this.server.emit(event, message);
  }

  // Send message to a specific client
  sendToClient(clientId: string, event: string, message: any): void {
    const client = this.server.sockets.sockets.get(clientId);
    if (client) {
      client.emit(event, message);
    } else {
      this.logger.log(`Client with ID ${clientId} not found.`);
    }
  }
}
