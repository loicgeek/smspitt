import { SSEBroadcaster } from './sse.js';
import { createMockServer } from './mock.js';
import { createUiServer }   from './ui.js';
import { createApiServer }  from './api.js';

export async function startServers(config, storage) {
  const sse = new SSEBroadcaster();

  const mock = createMockServer(config, storage, sse);
  const ui   = config.noUi ? null : createUiServer(config, sse);
  const api  = createApiServer(config, storage, sse);

  await Promise.all([
    listen(mock, config.mockPort, 'Mock API'),
    ui ? listen(ui, config.uiPort, 'Web UI') : Promise.resolve(),
    listen(api,  config.apiPort, 'Test API'),
  ]);

  return { mock, ui, api, sse };
}

function listen(server, port, name) {
  return new Promise((resolve, reject) => {
    server.once('error', err => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${port} (${name}) already in use. Use --${name.toLowerCase().replace(' ', '-')}-port to change it.`));
      } else {
        reject(err);
      }
    });
    server.listen(port, '0.0.0.0', resolve);
  });
}
