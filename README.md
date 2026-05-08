# SMSPit

> The Mailpit for SMS. Intercept, inspect and simulate SMS messages during development and testing.

SMSPit is a local mock server that imitates the HTTP APIs of real SMS providers (Twilio, Orange, Vonage, Africa's Talking). Your app sends SMS normally — SMSPit captures every message without forwarding it, and exposes them through a live Web UI and a REST API for test assertions.

**Zero config. Single binary. `npx smspitt` and you're done.**

---

## Quick start

```bash
npx smspitt
```

Then point your app at `http://localhost:2876` instead of the real provider API. Messages appear in the Web UI at `http://localhost:2875` in real time.

---

## Ports

| Port | Service | Mnemonic |
|------|---------|----------|
| **2875** | Web UI | 28-75 = "SMS" on a T9 keypad |
| **2876** | Mock Provider API | your app sends here |
| **2877** | Test REST API | your tests assert here |

---

## Providers

### Twilio

```bash
curl -X POST http://localhost:2876/twilio/2010-04-01/Accounts/ACtest/Messages.json \
  -d "To=%2B237612345678&From=MYAPP&Body=Your+code+is+4821&StatusCallback=http://localhost:8000/sms/status"
```

```json
{
  "sid": "SM01KR2SDWW...",
  "status": "queued",
  "to": "+237612345678",
  "from": "MYAPP",
  "body": "Your code is 4821",
  "num_segments": "1",
  "date_created": "2026-05-08T03:17:19.373Z"
}
```

### Orange SMS API

```bash
curl -X POST http://localhost:2876/orange/smsmessaging/outbound/requests \
  -H "Content-Type: application/json" \
  -d '{
    "outboundSMSMessageRequest": {
      "address": "tel:+237612345678",
      "senderAddress": "tel:ORANGE-CI",
      "outboundSMSTextMessage": { "message": "Votre code est 9931" }
    }
  }'
```

### Vonage (Nexmo)

```bash
curl -X POST http://localhost:2876/vonage/sms/json \
  -d "to=%2B237612345678&from=VONAGE-TEST&text=Hello+world&api_key=test&api_secret=test"
```

### Africa's Talking

```bash
curl -X POST http://localhost:2876/africastalking/version1/messaging \
  -d "to=%2B237612345678&from=ATTEST&message=Hello+AT&username=sandbox"
```

### Generic (universal fallback)

Use this when you don't need to imitate a specific provider. Accepts JSON or form-urlencoded.

```bash
curl -X POST http://localhost:2876/generic \
  -H "Content-Type: application/json" \
  -d '{"to": "+237612345678", "from": "MYAPP", "message": "Welcome!", "webhookUrl": "http://localhost:8000/sms/status"}'
```

---

## Web UI

Open `http://localhost:2875` to get a real-time dashboard:

- **Live updates** via Server-Sent Events — no polling, no reload
- **Search** across `to`, `from`, `body`
- **Filter** by provider and status
- **Message detail** — encoding (GSM7/UCS2), segment count, raw request payload
- **Simulate delivery receipt** → triggers your webhook callback
- **Simulate failure / undelivered** → changes status + fires webhook
- **Simulate inbound SMS** → POST to your app's inbound webhook URL

---

## Test REST API (port 2877)

Designed for assertions in PHPUnit, Jest, Pytest, or any HTTP-capable test runner.

### List messages

```bash
GET /api/v1/messages
GET /api/v1/messages?to=%2B237612345678
GET /api/v1/messages?from=MYAPP
GET /api/v1/messages?body=code
GET /api/v1/messages?provider=twilio
GET /api/v1/messages?status=queued
```

```json
{
  "total": 1,
  "messages": [{
    "id": "01KR2SDWW...",
    "to": "+237612345678",
    "from": "MYAPP",
    "body": "Your code is 4821",
    "provider": "twilio",
    "encoding": "GSM7",
    "parts": 1,
    "status": "queued",
    "webhookUrl": "http://localhost:8000/sms/status",
    "rawRequest": { "To": "+237612345678", ... },
    "createdAt": "2026-05-08T03:17:19.373Z",
    "updatedAt": "2026-05-08T03:17:19.374Z"
  }]
}
```

### Get one message

```bash
GET /api/v1/messages/:id
```

### Reset (call between tests)

```bash
DELETE /api/v1/messages
```

```json
{ "deleted": 3 }
```

### Simulate delivery / failure

```bash
POST /api/v1/messages/:id/status
Content-Type: application/json

{ "status": "delivered" }   # or "failed" | "undelivered"
```

Fires the `webhookUrl` if the message had one.

### Simulate inbound SMS

```bash
POST /api/v1/inbound
Content-Type: application/json

{
  "from": "+237655000000",
  "to": "+237612345678",
  "body": "OUI",
  "webhookUrl": "http://localhost:8000/sms/inbound"
}
```

SMSPit posts the payload to `webhookUrl` and stores the inbound message.

### Healthcheck

```bash
GET /api/v1/health
```

```json
{ "status": "ok", "version": "0.1.0", "storage": "memory", "messages": 5, "uptime": 42 }
```

---

## CLI options

```
npx smspitt [options]

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
```

### Examples

```bash
# Default — memory storage, open browser
npx smspitt

# SQLite persistence
npx smspitt --storage=sqlite

# Custom ports
npx smspitt --mock-port=3001 --ui-port=3000 --api-port=3002

# CI / headless — no browser, no UI
npx smspitt --no-ui --no-open

# Verbose logging
npx smspitt --verbose
```

---

## Storage

### In-memory (default)

Messages are kept in a `Map`. Fast, zero-config, lost on restart. Capped at `--max-messages` (default 200, oldest entry evicted first).

### SQLite (`--storage=sqlite`)

```bash
npx smspitt --storage=sqlite --db-path=/tmp/smspitt.db
```

Messages survive restarts. Uses `better-sqlite3` with WAL mode. Indexed on `to`, `from`, and `created_at`.

---

## Laravel companion package

```bash
composer require --dev ntechservices/smspitt-laravel
```

Add to `.env.testing` or `.env.local`:

```env
SMSPITT_URL=http://localhost:2876
SMSPITT_API_URL=http://localhost:2877
```

### Sending via SMSPit channel

```php
// config/services.php
'smspitt' => [
    'url' => env('SMSPITT_URL', 'http://localhost:2876'),
],
```

```php
use NtechServices\SmsPitt\SmsPittChannel;

// In a notification:
public function via(object $notifiable): array
{
    return [SmsPittChannel::class];
}

public function toSms(object $notifiable): SmsMessage
{
    return (new SmsMessage)->content('Your code is 4821');
}
```

### PHPUnit assertions

```php
use NtechServices\SmsPitt\SmsPittFake;

class OtpTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        SmsPittFake::reset(); // clear between tests
    }

    public function test_otp_is_sent_on_login(): void
    {
        $this->post('/login', ['phone' => '+237612345678', 'password' => 'secret']);

        SmsPittFake::assertSentTo('+237612345678');
        SmsPittFake::assertBodyContains('+237612345678', 'code');
        SmsPittFake::assertCount(1);
    }

    public function test_no_sms_on_failed_login(): void
    {
        $this->post('/login', ['phone' => '+237612345678', 'password' => 'wrong']);

        SmsPittFake::assertNothingSent();
    }
}
```

---

## Docker

```bash
docker run -p 2875:2875 -p 2876:2876 -p 2877:2877 ntechservices/smspitt
```

### docker-compose

```yaml
services:
  smspitt:
    image: ntechservices/smspitt:latest
    ports:
      - "2875:2875"
      - "2876:2876"
      - "2877:2877"
```

With SQLite persistence:

```yaml
services:
  smspitt:
    image: ntechservices/smspitt:latest
    ports:
      - "2875:2875"
      - "2876:2876"
      - "2877:2877"
    volumes:
      - smspitt-data:/root/.smspitt
    command: ["--no-open", "--storage=sqlite"]

volumes:
  smspitt-data:
```

---

## Distribution

| Channel | Command |
|---------|---------|
| npm (one-off) | `npx smspitt` |
| npm (global) | `npm install -g smspitt` |
| Homebrew | `brew install ntechservices/tap/smspitt` |
| Docker | `docker run ntechservices/smspitt` |

### Build a standalone binary

```bash
# Single bundled JS file (requires Node on the machine)
npx @vercel/ncc build bin/smspitt.js -o dist/

# Native executables — no Node required
npx pkg bin/smspitt.js --targets node22-linux-x64,node22-macos-arm64,node22-win-x64
```

---

## Programmatic use

```js
import { startServers, MemoryStorage } from 'smspitt';

const storage = new MemoryStorage(500);
const config  = {
  version:     '0.1.0',
  mockPort:    2876,
  uiPort:      2875,
  apiPort:     2877,
  storage:     'memory',
  noUi:        false,
  noOpen:      true,
  verbose:     false,
  maxMessages: 500,
};

const { sse } = await startServers(config, storage);

// Listen for new messages
sse.broadcast('message.created', { ... });
```

---

## Message schema

```ts
{
  id:          string;   // ULID
  provider:    'twilio' | 'orange' | 'vonage' | 'africastalking' | 'generic' | 'inbound';
  from:        string;   // sender number or alphanumeric ID
  to:          string;   // recipient in E.164 format
  body:        string;
  encoding:    'GSM7' | 'UCS2';
  parts:       number;   // SMS segment count
  status:      'queued' | 'delivered' | 'failed' | 'undelivered' | 'received';
  webhookUrl:  string | null;
  rawRequest:  object;   // original request payload
  createdAt:   string;   // ISO 8601
  updatedAt:   string;
}
```

---

## Roadmap

### v0.1.0 — MVP ✅
- Mock API: Twilio, Orange, Vonage, Africa's Talking, Generic
- In-memory storage
- Web UI with SSE live updates
- Test REST API (list, filter, delete, healthcheck)
- Delivery / failure simulation with webhook dispatch
- Inbound SMS simulation
- `npx smspitt` functional

### v0.2.0
- SQLite storage (included, flag `--storage=sqlite`)
- Laravel companion package (`ntechservices/smspitt-laravel`)
- Docker Hub official image

### v0.3.0
- Advanced search and date filters
- Configurable error simulation (invalid number, quota exceeded)
- Latency simulation (`--simulate-latency=500`)
- Export JSON / CSV
- npm assertion helpers for Jest/Vitest

### v1.0.0
- Homebrew tap
- Documentation site (VitePress)
- Pytest companion package

---

## License

MIT © [NtechServices](https://github.com/ntechservices)
