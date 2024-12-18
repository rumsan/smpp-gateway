import {
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';
import * as smpp from 'smpp';
import {
  InvalidMessageFormatError,
  SMPPDeliveryReceipt,
  UnsupportedDeliveryStatusError,
} from './smpp.delivery-receipts';
import { WebSocketService } from './websocket.service';

@Injectable()
export class SMPPGateway implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(SMPPGateway.name);
  private session: any;
  private reconnectInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private retryCount = 0;

  constructor(
    private readonly config: {
      host: string;
      port: number;
      systemId: string;
      password: string;
      debug: boolean;
    },
    private readonly websocketService: WebSocketService,
  ) {
    console.log(config);
  }

  async onModuleInit(): Promise<void> {
    this.logger.log('Initializing SMPP Gateway...');
    try {
      await this.connect();
    } catch (error) {
      this.logger.error('Error during SMPP Gateway initialization:', error);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    this.logger.log('Shutting down SMPP Gateway...');
    if (this.session) {
      try {
        this.session.close();
        this.logger.log('SMPP session closed gracefully.');
      } catch (error) {
        this.logger.error('Error closing SMPP session:', error);
      }
    }
  }

  async connect(): Promise<void> {
    this.logger.log('Establishing connection to SMPP server...');
    try {
      this.createConnectionSession();
      this.handleReconnection();
      this.handleMessageDeliveryReceipt();
    } catch (error) {
      this.logger.error('Error establishing SMPP connection:', error);
      throw error;
    }
  }

  async sendMessage(params: {
    source: string;
    destination: string;
    shortMessage: string;
  }): Promise<{ messageId: string; commandStatus: number }> {
    if (!this.isConnected) {
      throw new Error('SMPP Gateway is not connected.');
    }

    return new Promise((resolve, reject) => {
      this.session.submit_sm(
        {
          registered_delivery: 1,
          source_addr: params.source,
          destination_addr: params.destination,
          short_message: params.shortMessage,
        },
        (pdu: any) => {
          if (pdu.command_status === 0) {
            this.logger.log(`Message sent successfully: ${pdu.message_id}`);
            resolve({
              messageId: pdu.message_id,
              commandStatus: pdu.command_status,
            });
          } else {
            this.logger.error(`Failed to send message: ${pdu.command_status}`);
            reject(new Error(`Failed to send message: ${pdu.command_status}`));
          }
        },
      );
    });
  }

  private createConnectionSession(): void {
    const { host, port, systemId, password, debug } = this.config;
    const smppConfig = {
      url: `smpp://${host}:${port}`,
      auto_enquire_link_period: 10000,
      debug: debug,
    };

    this.session = smpp.connect(smppConfig, () => {
      this.logger.log('Connected to SMPP server, binding transceiver...');
      this.session.bind_transceiver(
        { system_id: systemId, password: password },
        (pdu: any) => {
          if (pdu.command_status !== 0) {
            this.logger.error('Failed to bind transceiver!');
            throw new Error('Failed to bind transceiver!');
          }
          this.logger.log('SMPP Gateway successfully bound as transceiver.');
          this.isConnected = true;
        },
      );
    });
  }

  private handleMessageDeliveryReceipt(): void {
    this.session.on('deliver_sm', (pdu: any) => {
      const rawMessage = pdu.message_payload
        ? pdu.message_payload.message
        : pdu.short_message.message;

      if (pdu.esm_class === smpp.ESM_CLASS.MC_DELIVERY_RECEIPT) {
        try {
          const deliveryReceipt = SMPPDeliveryReceipt.parse(rawMessage);
          this.logger.log(
            `Received delivery receipt: ${JSON.stringify(deliveryReceipt)}`,
          );
        } catch (error) {
          if (
            error instanceof InvalidMessageFormatError ||
            error instanceof UnsupportedDeliveryStatusError
          ) {
            this.logger.warn(
              `Unsupported delivery receipt message: ${rawMessage}`,
            );
          }
        }
      } else {
        this.logger.log(
          `Incoming message: ${JSON.stringify({
            source: pdu.source_addr,
            destination: pdu.destination_addr,
            message: rawMessage,
          })}`,
        );

        // Broadcast the incoming message to WebSocket clients
        this.websocketService.broadcast('sms_received', {
          source: pdu.source_addr,
          destination: pdu.destination_addr,
          message: rawMessage,
        });
      }
    });
  }

  private handleReconnection(): void {
    this.session.on('error', (err: any) => {
      this.logger.error(`SMPP Session error: ${err.message}`);
    });

    this.session.socket.on('close', () => {
      this.isConnected = false;
      this.logger.warn('SMPP connection closed. Reconnecting...');
      if (!this.reconnectInterval) {
        this.reconnectInterval = setInterval(() => {
          this.logger.log('Attempting to reconnect...');
          this.session.connect();
        }, this.getReconnectDelay());
      }
    });

    this.session.socket.on('readable', () => {
      if (!this.isConnected) {
        // Only log when connection is actually restored
        this.isConnected = true;
        this.logger.log('SMPP connection restored.');
        if (this.reconnectInterval) {
          clearInterval(this.reconnectInterval);
          this.reconnectInterval = null;
        }
      }
    });
  }

  private getReconnectDelay(): number {
    // Example: exponential backoff or a delay based on retry count
    const delay = Math.min(1000 * Math.pow(2, this.retryCount), 30000);
    this.retryCount += 1;
    return delay;
  }
}
