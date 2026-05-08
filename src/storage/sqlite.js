import Database from 'better-sqlite3';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS messages (
  id         TEXT PRIMARY KEY,
  provider   TEXT NOT NULL,
  from_addr  TEXT NOT NULL,
  to_addr    TEXT NOT NULL,
  body       TEXT NOT NULL,
  encoding   TEXT DEFAULT 'GSM7',
  parts      INTEGER DEFAULT 1,
  status     TEXT DEFAULT 'queued',
  webhook_url TEXT,
  raw_request TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_to      ON messages(to_addr);
CREATE INDEX IF NOT EXISTS idx_from    ON messages(from_addr);
CREATE INDEX IF NOT EXISTS idx_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status  ON messages(status);
`;

function toMessage(row) {
  if (!row) return null;
  return {
    id:         row.id,
    provider:   row.provider,
    from:       row.from_addr,
    to:         row.to_addr,
    body:       row.body,
    encoding:   row.encoding,
    parts:      row.parts,
    status:     row.status,
    webhookUrl: row.webhook_url ?? null,
    rawRequest: row.raw_request ? JSON.parse(row.raw_request) : null,
    createdAt:  row.created_at,
    updatedAt:  row.updated_at,
  };
}

export class SQLiteStorage {
  #db;

  constructor(dbPath) {
    mkdirSync(dirname(dbPath), { recursive: true });
    this.#db = new Database(dbPath);
    this.#db.pragma('journal_mode = WAL');
    this.#db.exec(SCHEMA);
  }

  save(message) {
    this.#db.prepare(`
      INSERT INTO messages (id, provider, from_addr, to_addr, body, encoding, parts, status, webhook_url, raw_request, created_at, updated_at)
      VALUES (@id, @provider, @from, @to, @body, @encoding, @parts, @status, @webhookUrl, @rawRequest, @createdAt, @updatedAt)
    `).run({
      ...message,
      rawRequest: message.rawRequest ? JSON.stringify(message.rawRequest) : null,
    });
    return message;
  }

  update(id, updates) {
    if (!this.findById(id)) return null;
    const colMap = { status: 'status', webhookUrl: 'webhook_url' };
    const updatedAt = new Date().toISOString();
    const fields = Object.keys(updates)
      .filter(k => colMap[k])
      .map(k => `${colMap[k]} = @${k}`)
      .join(', ');
    if (!fields) return this.findById(id);
    this.#db.prepare(`UPDATE messages SET ${fields}, updated_at = @updatedAt WHERE id = @id`)
      .run({ ...updates, id, updatedAt });
    return this.findById(id);
  }

  findAll({ to, from, body, provider, status } = {}) {
    let sql = 'SELECT * FROM messages WHERE 1=1';
    const params = {};

    if (to)       { sql += ' AND to_addr LIKE @to';       params.to = `%${to}%`; }
    if (from)     { sql += ' AND from_addr LIKE @from';   params.from = `%${from}%`; }
    if (body)     { sql += ' AND body LIKE @body';        params.body = `%${body}%`; }
    if (provider) { sql += ' AND provider = @provider';   params.provider = provider; }
    if (status)   { sql += ' AND status = @status';       params.status = status; }

    sql += ' ORDER BY created_at DESC';
    return this.#db.prepare(sql).all(params).map(toMessage);
  }

  findById(id) {
    return toMessage(this.#db.prepare('SELECT * FROM messages WHERE id = ?').get(id));
  }

  deleteAll() {
    return this.#db.prepare('DELETE FROM messages').run().changes;
  }

  count() {
    return this.#db.prepare('SELECT COUNT(*) as n FROM messages').get().n;
  }

  close() {
    this.#db.close();
  }
}
