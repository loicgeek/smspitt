import { detectEncoding, countParts } from '../utils/sms.js';

export function parse(body) {
  const text = body.message ?? body.body ?? '';
  const to = String(body.to ?? '').split(',').map(s => s.trim()).join(',');
  const encoding = detectEncoding(text);
  return {
    from:       body.from ?? body.username ?? 'AFRICASTALKING',
    to:         to.split(',')[0] ?? '',
    body:       text,
    encoding,
    parts:      countParts(text, encoding),
    webhookUrl: null,
  };
}

export function response(message) {
  return {
    SMSMessageData: {
      Message: 'Sent to 1/1 Total Cost: ZAR 0.1000',
      Recipients: [{
        statusCode: 101,
        number:     message.to,
        status:     'Success',
        cost:       'KES 0.8000',
        messageId:  message.id,
      }],
    },
  };
}
