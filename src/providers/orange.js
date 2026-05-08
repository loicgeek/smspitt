import { detectEncoding, countParts } from '../utils/sms.js';

export function parse(body) {
  const req = body.outboundSMSMessageRequest ?? body;
  const text = req.outboundSMSTextMessage?.message ?? req.message ?? '';
  const to   = (req.address ?? req.to ?? '').replace(/^tel:/, '');
  const from = (req.senderAddress ?? req.from ?? '').replace(/^tel:/, '');
  const encoding = detectEncoding(text);
  return {
    from,
    to,
    body:       text,
    encoding,
    parts:      countParts(text, encoding),
    webhookUrl: req.receiptRequest?.notifyURL ?? null,
  };
}

export function response(message) {
  return {
    outboundSMSMessageRequest: {
      address:       `tel:${message.to}`,
      senderAddress: `tel:${message.from}`,
      outboundSMSTextMessage: { message: message.body },
      deliveryInfoList: {
        deliveryInfo: [{
          address:        `tel:${message.to}`,
          deliveryStatus: 'DeliveredToNetwork',
        }],
        resourceURL: `http://localhost:2876/orange/smsmessaging/outbound/${encodeURIComponent(`tel:${message.from}`)}/requests/${message.id}`,
      },
      resourceURL: `http://localhost:2876/orange/smsmessaging/outbound/${encodeURIComponent(`tel:${message.from}`)}/requests/${message.id}`,
    },
  };
}
