import { describe, expect, test } from "bun:test";
import { acquireSixelCachePatch } from "../plugin/cache-patch";

function fixture() {
  class Budget {
    sent = new Set<number>();
    calls = 0;
    shouldTransmit(id: number): boolean {
      this.calls++;
      return !this.sent.has(id);
    }
  }
  let sixel = true;
  return { Budget, isSixel: () => sixel, setSixel: (value: boolean) => { sixel = value; } };
}

describe("SIXEL cache patch lifecycle", () => {
  test("existing instances bypass only SIXEL; other protocols preserve receiver and return value", () => {
    const { Budget, isSixel, setSixel } = fixture();
    const budget = new Budget();
    const descriptor = Object.getOwnPropertyDescriptor(Budget.prototype, "shouldTransmit");
    const lease = acquireSixelCachePatch(Budget.prototype, isSixel);
    expect(budget.shouldTransmit(1)).toBe(false);
    expect(budget.calls).toBe(0);
    setSixel(false);
    expect(budget.shouldTransmit(1)).toBe(true);
    budget.sent.add(1);
    expect(budget.shouldTransmit(1)).toBe(false);
    expect(budget.calls).toBe(2);
    lease.release();
    expect(Object.getOwnPropertyDescriptor(Budget.prototype, "shouldTransmit")).toEqual(descriptor);
  });

  test("off and on take effect immediately", () => {
    const { Budget, isSixel } = fixture();
    const original = Object.getOwnPropertyDescriptor(Budget.prototype, "shouldTransmit");
    const lease = acquireSixelCachePatch(Budget.prototype, isSixel);
    const budget = new Budget();
    lease.setEnabled(false);
    expect(Object.getOwnPropertyDescriptor(Budget.prototype, "shouldTransmit")).toEqual(original);
    expect(lease.status()).toMatchObject({ attached: true, enabled: false });
    expect(budget.shouldTransmit(3)).toBe(true);
    lease.setEnabled(true);
    expect(Budget.prototype.shouldTransmit).not.toBe(original?.value);
    expect(budget.shouldTransmit(3)).toBe(false);
    expect(lease.status().bypasses).toBe(1);
    lease.release();
    expect(budget.shouldTransmit(3)).toBe(true);
    expect(() => lease.setEnabled(true)).toThrow("detached");
  });

  test("duplicate factories share one wrapper until the final owner releases", () => {
    const { Budget, isSixel } = fixture();
    const original = Budget.prototype.shouldTransmit;
    const first = acquireSixelCachePatch(Budget.prototype, isSixel);
    const wrapped = Budget.prototype.shouldTransmit;
    const second = acquireSixelCachePatch(Budget.prototype, isSixel);
    expect(Budget.prototype.shouldTransmit).toBe(wrapped);
    expect(first.status().owners).toBe(2);
    first.release();
    first.release();
    expect(second.status().owners).toBe(1);
    expect(new Budget().shouldTransmit(1)).toBe(false);
    second.release();
    expect(Budget.prototype.shouldTransmit).toBe(original);
  });

  test("shutdown preserves a later extension wrapper and turns retained references into pass-throughs", () => {
    const { Budget, isSixel } = fixture();
    const lease = acquireSixelCachePatch(Budget.prototype, isSixel);
    const cached = Budget.prototype.shouldTransmit;
    function later(this: Budget, id: number): boolean { return cached.call(this, id); }
    Budget.prototype.shouldTransmit = later;
    expect(() => acquireSixelCachePatch(Budget.prototype, isSixel)).toThrow("another extension");
    lease.release();
    expect(Budget.prototype.shouldTransmit).toBe(later);
    expect(new Budget().shouldTransmit(1)).toBe(true);
  });

  test("unsupported method descriptor remains untouched", () => {
    const { Budget, isSixel } = fixture();
    Object.defineProperty(Budget.prototype, "shouldTransmit", { configurable: false });
    expect(() => acquireSixelCachePatch(Budget.prototype, isSixel)).toThrow("supported");
    expect(new Budget().shouldTransmit(1)).toBe(true);
    expect(Object.getOwnPropertySymbols(Budget.prototype)).toHaveLength(0);
  });

  test("already-fixed upstream logic is still intercepted; disabling restores that fixed implementation", () => {
    let sixel = true;
    let upstreamCalls = 0;
    class FixedBudget {
      sent = new Set<number>();
      shouldTransmit(id: number): boolean {
        upstreamCalls++;
        return sixel ? false : !this.sent.has(id);
      }
    }
    const original = FixedBudget.prototype.shouldTransmit;
    const lease = acquireSixelCachePatch(FixedBudget.prototype, () => sixel);
    const budget = new FixedBudget();
    expect(FixedBudget.prototype.shouldTransmit).not.toBe(original);
    expect(budget.shouldTransmit(1)).toBe(false);
    expect(upstreamCalls).toBe(0);
    expect(lease.status().bypasses).toBe(1);
    lease.setEnabled(false);
    expect(FixedBudget.prototype.shouldTransmit).toBe(original);
    expect(budget.shouldTransmit(1)).toBe(false);
    expect(upstreamCalls).toBe(1);
    lease.setEnabled(true);
    expect(budget.shouldTransmit(1)).toBe(false);
    expect(upstreamCalls).toBe(1);
    sixel = false;
    expect(budget.shouldTransmit(1)).toBe(true);
    lease.release();
    expect(FixedBudget.prototype.shouldTransmit).toBe(original);
  });

  test("duplicate loading while off stays off, and remaining owners can re-enable", () => {
    const { Budget, isSixel } = fixture();
    const original = Budget.prototype.shouldTransmit;
    const first = acquireSixelCachePatch(Budget.prototype, isSixel);
    first.setEnabled(false);
    const second = acquireSixelCachePatch(Budget.prototype, isSixel);
    expect(second.status()).toMatchObject({ attached: true, enabled: false, owners: 2 });
    expect(Budget.prototype.shouldTransmit).toBe(original);
    first.release();
    second.setEnabled(true);
    expect(new Budget().shouldTransmit(1)).toBe(false);
    second.release();
    expect(Budget.prototype.shouldTransmit).toBe(original);
  });

  test("later changes made while off are preserved and cannot be overwritten on re-enable", () => {
    const { Budget, isSixel } = fixture();
    const lease = acquireSixelCachePatch(Budget.prototype, isSixel);
    lease.setEnabled(false);
    function later(): boolean { return false; }
    Budget.prototype.shouldTransmit = later;
    expect(() => lease.setEnabled(true)).toThrow("detached");
    lease.release();
    expect(Budget.prototype.shouldTransmit).toBe(later);
  });
});
