export async function dispatch(webhookUrl, payload, { verbose = false } = {}) {
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
      signal:  AbortSignal.timeout(5_000),
    });
    if (verbose) {
      console.log(`[webhook] POST ${webhookUrl} → ${res.status}`);
    }
  } catch (err) {
    if (verbose) {
      console.warn(`[webhook] POST ${webhookUrl} failed: ${err.message}`);
    }
  }
}

export function deliveryReceiptPayload(message, status) {
  return {
    MessageSid:   `SM${message.id}`,
    SmsSid:       `SM${message.id}`,
    AccountSid:   'AC_smspitt',
    From:         message.from,
    To:           message.to,
    Body:         message.body,
    MessageStatus: status,
    SmsStatus:    status,
    ErrorCode:    status === 'failed' ? '30006' : null,
  };
}

export function inboundPayload(from, to, body, provider = 'generic') {
  if (provider === 'twilio') {
    return {
      MessageSid: `SM_inbound_${Date.now()}`,
      From:       from,
      To:         to,
      Body:       body,
      NumMedia:   '0',
    };
  }
  return { from, to, message: body };
}
