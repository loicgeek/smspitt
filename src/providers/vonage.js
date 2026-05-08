import { detectEncoding, countParts } from '../utils/sms.js';

export function parse(body) {
  const text = body.text ?? body.message ?? body.body ?? '';
  const encoding = detectEncoding(text);
  return {
    from:       String(body.from ?? ''),
    to:         String(body.to ?? ''),
    body:       text,
    encoding,
    parts:      countParts(text, encoding),
    webhookUrl: body.callback ?? null,
  };
}

export function response(message) {
  return {
    'message-count': '1',
    messages: [{
      to:               message.to,
      'message-id':     message.id,
      status:           '0',
      'remaining-balance': '10.00000000',
      'message-price':  '0.03330000',
      network:          '62001',
    }],
  };
}
