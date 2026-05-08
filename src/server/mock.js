import { createServer } from 'http';
import { ulid } from '../utils/ulid.js';
import { parseBody, respond, now } from '../utils/sms.js';
import * as twilio from '../providers/twilio.js';
import * as orange from '../providers/orange.js';
import * as vonage from '../providers/vonage.js';
import * as africastalking from '../providers/africastalking.js';
import * as generic from '../providers/generic.js';

const PROVIDERS = {
  twilio,
  orange,
  vonage,
  africastalking,
  generic,
};

function matchRoute(method, path) {
  if (method !== 'POST') return null;
  if (/^\/twilio\/2010-04-01\/Accounts\/[^/]+\/Messages\.json$/.test(path)) return 'twilio';
  if (path === '/orange/smsmessaging/outbound/requests')                      return 'orange';
  if (path === '/vonage/sms/json')                                            return 'vonage';
  if (path === '/africastalking/version1/messaging')                          return 'africastalking';
  if (path === '/generic')                                                    return 'generic';
  return null;
}

export function createMockServer(config, storage, sse) {
  const server = createServer(async (req, res) => {
    const url    = new URL(req.url, `http://localhost:${config.mockPort}`);
    const method = req.method.toUpperCase();

    if (method === 'OPTIONS') {
      respond(res, 204, {});
      return;
    }

    const provider = matchRoute(method, url.pathname);

    if (!provider) {
      respond(res, 404, { error: 'Route not found', path: url.pathname });
      return;
    }

    let body;
    try {
      body = await parseBody(req);
    } catch {
      respond(res, 400, { error: 'Invalid request body' });
      return;
    }

    const handler = PROVIDERS[provider];
    const parsed  = handler.parse(body);

    const message = {
      id:         ulid(),
      provider,
      from:       parsed.from,
      to:         parsed.to,
      body:       parsed.body,
      encoding:   parsed.encoding,
      parts:      parsed.parts,
      status:     'queued',
      webhookUrl: parsed.webhookUrl,
      rawRequest: body,
      createdAt:  now(),
      updatedAt:  now(),
    };

    storage.save(message);
    sse.broadcast('message.created', message);

    if (config.verbose) {
      console.log(`[mock] ${provider.toUpperCase()} → ${message.to} (${message.id})`);
    }

    const statusCode = provider === 'twilio' ? 201 : 200;
    respond(res, statusCode, handler.response(message));
  });

  return server;
}
