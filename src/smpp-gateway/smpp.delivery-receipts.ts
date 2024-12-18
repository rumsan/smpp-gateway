const PATTERN =
  /^id:(?<messageId>[\w-]+)\ssub:(?<sub>\d+)\sdlvrd:(?<dlvrd>\d+).+stat:(?<stat>\w+)/;

class InvalidMessageFormatError extends Error {}
class UnsupportedDeliveryStatusError extends Error {}

class SMPPDeliveryReceipt {
  messageId: string;
  status: string;

  constructor(messageId: string, status: string) {
    this.messageId = messageId;
    this.status = status;
  }

  static parse(message: string): SMPPDeliveryReceipt {
    const matches = message.match(PATTERN);

    if (!matches?.groups) {
      throw new InvalidMessageFormatError('Invalid Delivery Message Format');
    }

    const { messageId, stat } = matches.groups;
    const status = SMPPDeliveryReceipt.mapStatus(stat);

    return new SMPPDeliveryReceipt(messageId, status);
  }

  private static mapStatus(stat: string): string {
    const statusMap: Record<string, string> = {
      DELIVERED: 'delivered',
      DELIVRD: 'delivered',
      ENROUTE: 'sent',
      UNDELIVERABLE: 'failed',
      UNDELIV: 'failed',
    };

    const status = statusMap[stat];
    if (!status) {
      throw new UnsupportedDeliveryStatusError(
        `Unsupported Delivery Status: ${stat}`,
      );
    }

    return status;
  }
}

export {
  InvalidMessageFormatError,
  SMPPDeliveryReceipt,
  UnsupportedDeliveryStatusError,
};
