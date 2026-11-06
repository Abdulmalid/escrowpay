// Idempotency: same key returns the original result; the effect applies once.

export interface IdempotencyRecord<T> {
  key: string;
  status: "completed" | "failed";
  response: T;
  createdAt: string;
}

export class IdempotencyLedger<T = unknown> {
  private records = new Map<string, IdempotencyRecord<T>>();

  static assertKey(key: string): void {
    if (typeof key !== "string" || key.length < 8 || key.length > 128) {
      throw new Error("Idempotency-Key must be 8-128 characters");
    }
  }

  get(key: string): IdempotencyRecord<T> | undefined {
    return this.records.get(key);
  }

  /**
   * Run `fn` once per key. Replays return `{ replayed: true }` with the
   * stored response. Concurrent same-key callers are serialized per key.
   */
  private locks = new Map<string, Promise<IdempotencyRecord<T>>>();

  async run(
    key: string,
    fn: () => Promise<T>,
  ): Promise<{ response: T; replayed: boolean }> {
    IdempotencyLedger.assertKey(key);
    const existing = this.records.get(key);
    if (existing?.status === "completed") {
      return { response: existing.response, replayed: true };
    }
    const inFlight = this.locks.get(key);
    if (inFlight) {
      const record = await inFlight;
      return { response: record.response, replayed: true };
    }
    const task = (async () => {
      try {
        const response = await fn();
        const record: IdempotencyRecord<T> = {
          key,
          status: "completed",
          response,
          createdAt: new Date().toISOString(),
        };
        this.records.set(key, record);
        return record;
      } catch (error) {
        this.records.set(key, {
          key,
          status: "failed",
          response: undefined as T,
          createdAt: new Date().toISOString(),
        });
        throw error;
      } finally {
        this.locks.delete(key);
      }
    })();
    this.locks.set(key, task);
    const record = await task;
    return { response: record.response, replayed: false };
  }

  /** Failed keys may be retried with the same key; completed keys never re-run. */
  clearFailed(key: string): void {
    const record = this.records.get(key);
    if (record?.status === "failed") this.records.delete(key);
  }

  size(): number {
    return this.records.size;
  }
}
