import { createServer } from 'http';
import { ulid } from '../utils/ulid.js';
import { parseBody, respond, now } from '../utils/sms.js';
import { dispatch, inboundPayload } from '../webhook/dispatcher.js';

export function createApiServer(config, storage, sse) {
  const server = createServer(async (req, res) => {
    const url    = new URL(req.url, `http://localhost:${config.apiPort}`);
    const method = req.method.toUpperCase();
    const path   = url.pathname;

    if (method === 'OPTIONS') {
      respond(res, 204, {});
      return;
    }

    // GET /api/v1/health
    if (method === 'GET' && path === '/api/v1/health') {
      respond(res, 200, {
        status:   'ok',
        version:  config.version,
        storage:  config.storage,
        messages: storage.count(),
        uptime:   Math.floor(process.uptime()),
      });
      return;
    }

    // GET /api/v1/messages
    if (method === 'GET' && path === '/api/v1/messages') {
      const filters = {
        to:       url.searchParams.get('to')       ?? undefined,
        from:     url.searchParams.get('from')     ?? undefined,
        body:     url.searchParams.get('body')     ?? undefined,
        provider: url.searchParams.get('provider') ?? undefined,
        status:   url.searchParams.get('status')   ?? undefined,
      };
      const messages = storage.findAll(filters);
      respond(res, 200, { total: messages.length, messages });
      return;
    }

    // GET /api/v1/messages/:id
    const msgMatch = path.match(/^\/api\/v1\/messages\/([^/]+)$/);
    if (method === 'GET' && msgMatch) {
      const message = storage.findById(msgMatch[1]);
      if (!message) { respond(res, 404, { error: 'Message not found' }); return; }
      respond(res, 200, message);
      return;
    }

    // DELETE /api/v1/messages
    if (method === 'DELETE' && path === '/api/v1/messages') {
      const count = storage.deleteAll();
      sse.broadcast('cleared', {});
      respond(res, 200, { deleted: count });
      return;
    }

    // POST /api/v1/messages/:id/status  (simulate delivery/failure)
    const statusMatch = path.match(/^\/api\/v1\/messages\/([^/]+)\/status$/);
    if (method === 'POST' && statusMatch) {
      let body;
      try { body = await parseBody(req); } catch { respond(res, 400, { error: 'Invalid body' }); return; }

      const { status } = body;
      if (!['delivered', 'failed', 'undelivered'].includes(status)) {
        respond(res, 422, { error: 'Invalid status', allowed: ['delivered', 'failed', 'undelivered'] });
        return;
      }

      const updated = storage.update(statusMatch[1], { status });
      if (!updated) { respond(res, 404, { error: 'Message not found' }); return; }

      sse.broadcast('message.updated', { id: updated.id, status: updated.status });

      if (updated.webhookUrl) {
        const { deliveryReceiptPayload } = await import('../webhook/dispatcher.js');
        dispatch(updated.webhookUrl, deliveryReceiptPayload(updated, status), config);
      }

      respond(res, 200, updated);
      return;
    }

    // POST /api/v1/inbound  (simulate inbound SMS)
    if (method === 'POST' && path === '/api/v1/inbound') {
      let body;
      try { body = await parseBody(req); } catch { respond(res, 400, { error: 'Invalid body' }); return; }

      const { from, to, body: text, webhookUrl } = body;
      if (!from || !to || !text) {
        respond(res, 422, { error: 'Required: from, to, body' });
        return;
      }

      if (webhookUrl) {
        const payload = inboundPayload(from, to, text, config.defaultProvider);
        dispatch(webhookUrl, payload, config);
      }

      const inbound = {
        id:         ulid(),
        provider:   'inbound',
        from,
        to,
        body:       text,
        encoding:   'GSM7',
        parts:      1,
        status:     'received',
        webhookUrl: webhookUrl ?? null,
        rawRequest: body,
        createdAt:  now(),
        updatedAt:  now(),
      };

      storage.save(inbound);
      sse.broadcast('message.created', inbound);

      respond(res, 201, inbound);
      return;
    }

    respond(res, 404, { error: 'Not found' });
  });

  return server;
}
