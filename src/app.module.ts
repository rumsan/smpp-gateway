import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SMPPGateway } from './smpp-gateway/smpp.gateway';
import { WebSocketService } from './smpp-gateway/websocket.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Makes the config available throughout the app
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    WebSocketService,
    {
      provide: SMPPGateway,
      useFactory: (webSocketService: WebSocketService) => {
        return new SMPPGateway(
          {
            host: process.env.SMPP_HOST || 'localhost',
            port: +process.env.SMPP_PORT || 2775,
            systemId: process.env.SMPP_USER,
            password: process.env.SMPP_PASS,
            debug: false,
          },
          webSocketService, // Inject WebSocketService here
        );
      },
      inject: [WebSocketService], // Explicitly inject WebSocketService
    },
  ],
})
export class AppModule {}
