import test from "node:test";
import assert from "node:assert/strict";
import { calculateInvoice } from "../lib/utils.ts";
import { createCsv } from "../lib/csv.ts";
import { getEffectiveInvoiceStatus, isPublicInvoice, sanitizeInvoiceForRole } from "../lib/domain/invoices.ts";
import { ROLE_PERMISSIONS, type Invoice } from "../types/index.ts";

const invoice: Invoice = {
  id: "11111111-1111-1111-1111-111111111111", publicToken: "22222222-2222-2222-2222-222222222222",
  invoiceNumber: "INV/2026/07/0001", customerId: "33333333-3333-3333-3333-333333333333", customerName: "Restoran",
  issueDate: "2026-07-01", dueDate: "2026-07-08", status: "ISSUED", subtotal: 100_000, discount: 0, total: 100_000,
  totalProductCost: 60_000, totalDirectCost: 5_000, productProfit: 40_000, transactionProfit: 35_000, transactionMargin: 35,
  items: [{ id: "1", productId: "p", descriptionSnapshot: "Ikan", unit: "kg", quantity: 1, sellingPriceSnapshot: 100_000, purchasePriceSnapshot: 60_000, subtotal: 100_000, totalPurchaseCost: 60_000, productProfit: 40_000 }],
  directCosts: [{ id: "1", category: "SHIPPING", name: "Kirim", amount: 5_000 }], totalPaid: 0, remainingBalance: 100_000,
  createdBy: "u", createdAt: "2026-07-01T00:00:00Z", updatedAt: "2026-07-01T00:00:00Z",
};

test("invoice calculations include discounts and direct costs", () => {
  const result = calculateInvoice([{ quantity: 2, sellingPrice: 50_000, purchasePrice: 30_000 }], [{ amount: 5_000 }], 10_000);
  assert.deepEqual(result, { subtotal: 100_000, revenue: 90_000, totalProductCost: 60_000, totalDirectCost: 5_000, productProfit: 30_000, transactionProfit: 25_000, transactionMargin: 25_000 / 90_000 * 100 });
});

test("overdue status is derived without mutating database state", () => {
  assert.equal(getEffectiveInvoiceStatus("ISSUED", "2026-07-08", new Date("2026-07-09T00:00:00Z")), "OVERDUE");
  assert.equal(getEffectiveInvoiceStatus("PAID", "2026-07-08", new Date("2026-07-09T00:00:00Z")), "PAID");
});

test("staff DTO removes internal financial fields", () => {
  const safe = sanitizeInvoiceForRole(invoice, false);
  assert.equal(safe.totalProductCost, 0);
  assert.equal(safe.items[0].purchasePriceSnapshot, 0);
  assert.deepEqual(safe.directCosts, []);
});

test("permission matrix keeps sensitive capabilities away from staff", () => {
  assert.equal(ROLE_PERMISSIONS.STAFF.includes("view_profit"), false);
  assert.equal(ROLE_PERMISSIONS.FINANCE.includes("record_payment"), true);
  assert.equal(ROLE_PERMISSIONS.OWNER.includes("manage_users"), true);
});

test("public invoice validator requires a public-safe contract", () => {
  assert.equal(isPublicInvoice({ publicToken: "t", invoiceNumber: "n", customerName: "c", items: [], company: {} }), true);
  assert.equal(isPublicInvoice(invoice), false);
});

test("CSV generator escapes formulas, commas, and quotes as text cells", () => {
  const csv = createCsv(["Name", "Value", "Formula"], [["A, B", 'He said "ok"', "=2+2"]]);
  assert.equal(csv, '"Name","Value","Formula"\r\n"A, B","He said ""ok""","\'=2+2"');
});
