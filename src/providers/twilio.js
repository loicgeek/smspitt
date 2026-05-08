import { detectEncoding, countParts } from '../utils/sms.js';

export function parse(body) {
  const text = body.Body ?? body.body ?? '';
  const encoding = detectEncoding(text);
  return {
    from:       body.From ?? body.from ?? '',
    to:         body.To ?? body.to ?? '',
    body:       text,
    encoding,
    parts:      countParts(text, encoding),
    webhookUrl: body.StatusCallback ?? body.statusCallback ?? null,
  };
}

export function response(message) {
  return {
    sid:          `SM${message.id}`,
    status:       'queued',
    to:           message.to,
    from:         message.from,
    body:         message.body,
    num_segments: String(message.parts),
    direction:    'outbound-api',
    date_created: message.createdAt,
    uri:          `/twilio/2010-04-01/Accounts/AC_smspitt/Messages/SM${message.id}.json`,
  };
}
