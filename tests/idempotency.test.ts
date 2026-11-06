import { describe, expect, it } from "vitest";
import { IdempotencyLedger } from "@/lib/idempotency";

describe("IdempotencyLedger", () => {
  it("runs once per key and replays the original result", async () => {
    const ledger = new IdempotencyLedger<string>();
    let calls = 0;
    const fn = async () => {
      calls += 1;
      return `result-${calls}`;
    };
    const first = await ledger.run("key-12345678", fn);
    const second = await ledger.run("key-12345678", fn);
    expect(first).toEqual({ response: "result-1", replayed: false });
    expect(second).toEqual({ response: "result-1", replayed: true });
    expect(calls).toBe(1);
  });

  it("serializes concurrent same-key callers", async () => {
    const ledger = new IdempotencyLedger<number>();
    let calls = 0;
    const fn = async () => {
      calls += 1;
      await new Promise((resolve) => setTimeout(resolve, 20));
      return calls;
    };
    const [a, b] = await Promise.all([
      ledger.run("concurrent-key", fn),
      ledger.run("concurrent-key", fn),
    ]);
    expect(calls).toBe(1);
    expect(a.response).toBe(1);
    expect(b.response).toBe(1);
    expect(b.replayed).toBe(true);
  });

  it("rejects short keys and allows retry after failure", async () => {
    const ledger = new IdempotencyLedger<string>();
    await expect(ledger.run("short", async () => "x")).rejects.toThrow();
    await expect(
      ledger.run("failing-key-1", async () => {
        throw new Error("boom");
      }),
    ).rejects.toThrow("boom");
    ledger.clearFailed("failing-key-1");
    const retry = await ledger.run("failing-key-1", async () => "recovered");
    expect(retry).toEqual({ response: "recovered", replayed: false });
  });
});
