export class MemoryStorage {
  #messages = new Map();
  #maxMessages;

  constructor(maxMessages = 200) {
    this.#maxMessages = maxMessages;
  }

  save(message) {
    if (this.#messages.size >= this.#maxMessages) {
      const oldest = this.#messages.keys().next().value;
      this.#messages.delete(oldest);
    }
    this.#messages.set(message.id, { ...message });
    return message;
  }

  update(id, updates) {
    const msg = this.#messages.get(id);
    if (!msg) return null;
    const updated = { ...msg, ...updates, updatedAt: new Date().toISOString() };
    this.#messages.set(id, updated);
    return updated;
  }

  findAll({ to, from, body, provider, status } = {}) {
    let results = [...this.#messages.values()];

    if (to) results = results.filter(m => m.to.includes(to));
    if (from) results = results.filter(m => m.from.toLowerCase().includes(from.toLowerCase()));
    if (body) results = results.filter(m => m.body.toLowerCase().includes(body.toLowerCase()));
    if (provider) results = results.filter(m => m.provider === provider);
    if (status) results = results.filter(m => m.status === status);

    return results.reverse();
  }

  findById(id) {
    return this.#messages.get(id) ?? null;
  }

  deleteAll() {
    const count = this.#messages.size;
    this.#messages.clear();
    return count;
  }

  count() {
    return this.#messages.size;
  }
}
