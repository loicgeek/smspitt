export class SSEBroadcaster {
  #clients = new Set();

  addClient(res) {
    res.writeHead(200, {
      'Content-Type':                'text/event-stream',
      'Cache-Control':               'no-cache, no-transform',
      'Connection':                  'keep-alive',
      'X-Accel-Buffering':           'no',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(':ok\n\n');

    const keepAlive = setInterval(() => res.write(':ping\n\n'), 25_000);
    this.#clients.add(res);

    res.on('close', () => {
      clearInterval(keepAlive);
      this.#clients.delete(res);
    });
  }

  broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of this.#clients) {
      client.write(payload);
    }
  }

  get size() {
    return this.#clients.size;
  }
}
