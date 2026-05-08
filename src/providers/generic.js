import { detectEncoding, countParts } from '../utils/sms.js';

export function parse(body) {
  const text = body.message ?? body.body ?? body.text ?? '';
  const encoding = detectEncoding(text);
  return {
    from:       String(body.from ?? body.sender ?? ''),
    to:         String(body.to ?? body.recipient ?? ''),
    body:       text,
    encoding,
    parts:      countParts(text, encoding),
    webhookUrl: body.webhookUrl ?? body.webhook_url ?? body.callback ?? null,
  };
}

export function response(message) {
  return {
    id:     message.id,
    status: 'queued',
  };
}
