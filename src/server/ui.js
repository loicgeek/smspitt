import { createServer } from 'http';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UI_DIR    = join(__dirname, '../ui');

function loadAssets(config) {
  const html   = readFileSync(join(UI_DIR, 'index.html'), 'utf8');
  const css    = readFileSync(join(UI_DIR, 'style.css'),  'utf8');
  const script = readFileSync(join(UI_DIR, 'app.js'),     'utf8');

  return html
    .replace('__STYLE__',    css)
    .replace('__SCRIPT__',   script
      .replaceAll('__API_PORT__',  String(config.apiPort))
      .replaceAll('__MOCK_PORT__', String(config.mockPort))
    )
    .replaceAll('__VERSION__',   config.version)
    .replaceAll('__MOCK_PORT__', String(config.mockPort));
}

export function createUiServer(config, sse) {
  const page = loadAssets(config);

  const server = createServer((req, res) => {
    const url    = new URL(req.url, `http://localhost:${config.uiPort}`);
    const method = req.method.toUpperCase();

    // SSE endpoint
    if (method === 'GET' && url.pathname === '/events') {
      sse.addClient(res);
      return;
    }

    // Serve UI
    if (method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) {
      const buf = Buffer.from(page, 'utf8');
      res.writeHead(200, {
        'Content-Type':   'text/html; charset=utf-8',
        'Content-Length': buf.length,
        'Cache-Control':  'no-cache',
      });
      res.end(buf);
      return;
    }

    res.writeHead(404);
    res.end('Not found');
  });

  return server;
}
