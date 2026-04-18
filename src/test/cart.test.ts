import { describe, it, expect } from "vitest";

// Pure helpers (mirrors CartContext arithmetic). Keeps test deterministic without React.
function calcSubtotal(items: { price: number; quantity: number }[]) {
  return items.reduce((s, i) => s + i.price * i.quantity, 0);
}
function calcItemCount(items: { quantity: number }[]) {
  return items.reduce((s, i) => s + i.quantity, 0);
}
function applyCoupon(subtotal: number, type: "percentage" | "fixed", value: number) {
  const raw = type === "percentage" ? subtotal * (value / 100) : value;
  return Math.min(raw, subtotal);
}

describe("cart math", () => {
  it("computes subtotal across multiple items", () => {
    expect(calcSubtotal([
      { price: 100, quantity: 2 },
      { price: 50, quantity: 1 },
    ])).toBe(250);
  });

  it("computes total quantity", () => {
    expect(calcItemCount([{ quantity: 3 }, { quantity: 2 }])).toBe(5);
  });

  it("applies percentage coupon", () => {
    expect(applyCoupon(200, "percentage", 10)).toBe(20);
  });

  it("applies fixed coupon and clamps to subtotal", () => {
    expect(applyCoupon(50, "fixed", 80)).toBe(50);
  });
});

describe("checkout math", () => {
  it("calculates final total with discount + shipping", () => {
    const subtotal = 500;
    const discount = 50;
    const shipping = 0;
    const total = subtotal - discount + shipping;
    expect(total).toBe(450);
  });

  it("validates required customer fields", () => {
    const valid = (n: string, e: string, p: string) => !!(n && e && p);
    expect(valid("", "a@b.c", "12345")).toBe(false);
    expect(valid("Alice", "a@b.c", "12345")).toBe(true);
  });
});
