import minimist from 'minimist';
import { homedir }       from 'os';
import { join, dirname } from 'path';
import { exec }          from 'child_process';
import { readFileSync }  from 'fs';
import { fileURLToPath } from 'url';
import { startServers }     from './server/index.js';
import { MemoryStorage }    from './storage/memory.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PKG       = JSON.parse(readFileSync(join(__dirname, '../package.json'), 'utf8'));

const argv = minimist(process.argv.slice(2), {
  default: {
    'mock-port':    2876,
    'ui-port':      2875,
    'api-port':     2877,
    storage:        'memory',
    'db-path':      join(homedir(), '.smspitt', 'messages.db'),
    'max-messages': 200,
    'no-ui':        false,
    'no-open':      false,
    provider:       'generic',
    verbose:        false,
  },
  boolean: ['no-ui', 'no-open', 'verbose', 'version', 'help'],
  alias: { v: 'version', h: 'help' },
});

if (argv.help) {
  console.log(`
  Usage: smspitt [options]

  Options:
    --mock-port      Port for Mock Provider API   (default: 2876)
    --ui-port        Port for Web UI              (default: 2875)
    --api-port       Port for Test REST API       (default: 2877)
    --storage        'memory' | 'sqlite'          (default: memory)
    --db-path        SQLite file path             (default: ~/.smspitt/messages.db)
    --max-messages   In-memory message limit      (default: 200)
    --no-ui          Disable Web UI (CI/headless)
    --no-open        Don't open browser on start
    --provider       Default provider for /generic (default: generic)
    --verbose        Detailed logs
    --version, -v    Show version
    --help,    -h    Show help
  `);
  process.exit(0);
}

if (argv.version) {
  console.log(PKG.version);
  process.exit(0);
}

const config = {
  version:         PKG.version,
  mockPort:        Number(argv['mock-port']),
  uiPort:          Number(argv['ui-port']),
  apiPort:         Number(argv['api-port']),
  storage:         argv.storage,
  dbPath:          argv['db-path'],
  maxMessages:     Number(argv['max-messages']),
  noUi:            argv['no-ui'],
  noOpen:          argv['no-open'],
  defaultProvider: argv.provider,
  verbose:         argv.verbose,
};

async function main() {
  let storage;
  if (config.storage === 'sqlite') {
    const { SQLiteStorage } = await import('./storage/sqlite.js');
    storage = new SQLiteStorage(config.dbPath);
  } else {
    storage = new MemoryStorage(config.maxMessages);
  }

  try {
    await startServers(config, storage);
  } catch (err) {
    console.error(`\n  ✖ ${err.message}\n`);
    process.exit(1);
  }

  printBanner(config);

  if (!config.noUi && !config.noOpen) {
    openBrowser(`http://localhost:${config.uiPort}`);
  }

  process.on('SIGINT',  () => shutdown(storage));
  process.on('SIGTERM', () => shutdown(storage));
}

function printBanner(config) {
  console.log(`
  ███████╗███╗   ███╗███████╗██████╗ ██╗████████╗
  ██╔════╝████╗ ████║██╔════╝██╔══██╗██║╚══██╔══╝
  ███████╗██╔████╔██║███████╗██████╔╝██║   ██║
  ╚════██║██║╚██╔╝██║╚════██║██╔═══╝ ██║   ██║
  ███████║██║ ╚═╝ ██║███████║██║     ██║   ██║
  ╚══════╝╚═╝     ╚═╝╚══════╝╚═╝     ╚═╝   ╚═╝

  v${config.version} — SMS Mock Server

  Mock API    →  http://localhost:${config.mockPort}
  ${config.noUi ? '(Web UI disabled)  ' : `Web UI      →  http://localhost:${config.uiPort}`}
  Test API    →  http://localhost:${config.apiPort}
  Storage     →  ${config.storage === 'sqlite' ? `sqlite (${config.dbPath})` : `memory (max ${config.maxMessages})`}

  Press Ctrl+C to stop
`);
}

function openBrowser(url) {
  const platform = process.platform;
  const cmd = platform === 'darwin' ? `open "${url}"` : platform === 'win32' ? `start "${url}"` : `xdg-open "${url}"`;
  exec(cmd, err => { if (err && config.verbose) console.warn('[open]', err.message); });
}

function shutdown(storage) {
  if (storage?.close) storage.close();
  console.log('\n  Bye!\n');
  process.exit(0);
}

main();
