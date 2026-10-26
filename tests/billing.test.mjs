import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { randomUUID, generateKeyPairSync, sign } from "node:crypto";
import { once } from "node:events";
import express from "express";
import { WaffoPancake } from "@waffo/pancake-ts";
import { BillingStore } from "../billing/store.mjs";
import {
  billingConfig,
  createBilling,
  subscriptionUntil,
  monthPassUntil,
} from "../billing/service.mjs";
import { mountBilling } from "../billing/http.mjs";

const keys = generateKeyPairSync("rsa", { modulusLength: 2048 });
const env = {
  WAFFO_MERCHANT_ID: "MER_5EMEWfhBB53tdi21MkTuMM",
  WAFFO_PRIVATE_KEY: keys.privateKey.export({ type: "pkcs8", format: "pem" }),
  WAFFO_ENVIRONMENT: "test",
  WAFFO_STORE_ID: "STO_5ljWhy4WDd1PUstxt8TaVK",
  WAFFO_SINGLE_PRODUCT_ID: "PROD_033xWaTJyyefzSTSHFeqrJ",
  WAFFO_MONTHLY_PRODUCT_ID: "PROD_1kPrylh47TRnfZ4WYR7POG",
  WAFFO_MONTH_PASS_PRODUCT_ID: "PROD_test_monthpass",
};
async function fixture(t) {
  const db = new DatabaseSync(":memory:");
  t.after(() => db.close());
  const store = new BillingStore(db, true);
  await store.migrate();
  return store;
}
async function credit(store, id = "order", user = "alice") {
  await store.query(
    "INSERT INTO billing_orders(id,user_id,plan,paid,created) VALUES($1,$2,'single',1,$3) RETURNING id",
    [id, user, Date.now()],
  );
}
const payment = (amount = "1.90", periodNumber = 1) => ({
  id: "PAY_test",
  status: "succeeded",
  refundStatus: "none",
  isFullyRefunded: false,
  periodNumber,
  createdAt: new Date(Date.now() - 60000).toISOString(),
  amount: { display: amount, currency: "USD" },
});
const period = () => ({
  status: "active",
  billingPeriod: "monthly",
  isInTrial: false,
  currentPeriodNumber: 2,
  currentPeriodStart: new Date(Date.now() - 60000).toISOString(),
  currentPeriodEnd: new Date(Date.now() + 60000).toISOString(),
  payments: [payment("9.90", 2)],
});
test("Pancake accepts only merchant/private key, normalizes DER and rejects invalid environment", () => {
  assert.equal(
    billingConfig({
      ...env,
      WAFFO_API_KEY: undefined,
      WAFFO_PUBLIC_KEY: undefined,
    }).environment,
    "test",
  );
  const raw = keys.privateKey
    .export({ type: "pkcs8", format: "der" })
    .toString("base64");
  assert.match(
    billingConfig({ ...env, WAFFO_PRIVATE_KEY: raw }).privateKey,
    /BEGIN PRIVATE KEY/,
  );
  assert.throws(() => billingConfig({ ...env, WAFFO_ENVIRONMENT: "wrong" }));
});
test("single credits are atomic, idempotent, isolated by account and environment", async (t) => {
  const store = await fixture(t);
  await credit(store);
  const ids = [randomUUID(), randomUUID(), randomUUID()];
  assert.equal(
    (await Promise.all(ids.map((id) => store.consume("alice", id)))).filter(
      Boolean,
    ).length,
    1,
  );
  assert.equal(await store.consume("alice", ids[0]), true);
  assert.equal(await store.consume("bob", ids[0]), false);
  const prod = new BillingStore(store.database, true, "prod");
  assert.equal(await prod.consume("alice", ids[0]), false);
  assert.equal((await prod.status("alice")).credits, 0);
});
test("monthly access expires without spending single credits", async (t) => {
  const store = await fixture(t);
  await credit(store);
  await store.query(
    "INSERT INTO billing_orders(id,user_id,plan,valid_until,created) VALUES('sub','alice','monthly',$1,$2) RETURNING id",
    [Date.now() + 60000, Date.now()],
  );
  for (let i = 0; i < 10; i++)
    assert.equal(await store.consume("alice", randomUUID()), true);
  assert.equal((await store.status("alice")).credits, 1);
  await store.query(
    "UPDATE billing_orders SET valid_until=0 WHERE id='sub' RETURNING id",
  );
  assert.equal(await store.consume("alice", randomUUID()), true);
  assert.equal(await store.consume("alice", randomUUID()), false);
});
test("subscriptions require current paid period, price, currency, no trial, and valid dates; cancellation keeps paid period", () => {
  assert.ok(subscriptionUntil(period()) > Date.now());
  const canceled = period();
  canceled.status = "canceling";
  assert.ok(subscriptionUntil(canceled) > Date.now());
  for (const change of [
    (r) => (r.payments = []),
    (r) => (r.payments[0].periodNumber = 1),
    (r) => (r.payments[0].amount.display = "0.00"),
    (r) => (r.payments[0].amount.currency = "EUR"),
    (r) => (r.payments[0].refundStatus = "full"),
    (r) => (r.status = "past_due"),
    (r) => (r.isInTrial = true),
    (r) => (r.currentPeriodNumber = null),
    (r) => (r.currentPeriodEnd = "2000-01-01T00:00:00Z"),
  ]) {
    const r = period();
    change(r);
    assert.equal(subscriptionUntil(r), 0);
  }
});
function mockClient() {
  const orders = new Map(),
    creates = [];
  return {
    orders,
    creates,
    graphql: {
      query: async ({ variables, query }) => ({
        data: {
          [query.includes("subscriptionOrders")
            ? "subscriptionOrders"
            : "onetimeOrders"]: orders.has(variables.ref)
            ? [orders.get(variables.ref)]
            : [],
        },
      }),
    },
    checkout: {
      authenticated: {
        create: async (params, options) => {
          creates.push({ params, options });
          return {
            checkoutUrl: "https://pancake.waffo.ai/test#token=fixture",
            expiresAt: new Date(Date.now() + 3600000).toISOString(),
          };
        },
      },
    },
    auth: {
      createCustomerPortalLink: async (p) => ({
        portalUrl: `https://pancake.waffo.ai/portal#identity=${p.buyerIdentity}`,
      }),
    },
  };
}
function remote(row, plan = "single") {
  return {
    id: "ORD_test",
    storeId: env.WAFFO_STORE_ID,
    status: "completed",
    currency: "USD",
    testMode: true,
    merchantProvidedBuyerIdentity: row.user_id,
    orderMerchantExternalId: row.id,
    productVersion: {
      productId:
        plan === "single"
          ? env.WAFFO_SINGLE_PRODUCT_ID
          : plan === "monthpass"
            ? env.WAFFO_MONTH_PASS_PRODUCT_ID
            : env.WAFFO_MONTHLY_PRODUCT_ID,
    },
    payments: [payment()],
  };
}
test("checkout binds stable signed-in identity and reuses session; reconciliation rejects mismatches and revoked payment", async (t) => {
  const store = await fixture(t),
    client = mockClient();
  const b = createBilling(
    {},
    { local: true, origin: "https://example.com" },
    env,
    { store, client },
  );
  const first = await b.checkout(
    { id: "alice", email: "alice@example.test" },
    "single",
  );
  const again = await b.checkout(
    { id: "alice", email: "alice@example.test" },
    "single",
  );
  assert.equal(first.orderId, again.orderId);
  assert.equal(client.creates.length, 1);
  assert.equal(client.creates[0].params.productId, env.WAFFO_SINGLE_PRODUCT_ID);
  assert.equal(client.creates[0].params.buyerIdentity, "alice");
  assert.equal(client.creates[0].params.withTrial, false);
  assert.ok(client.creates[0].options.idempotencyKey);
  const [row] = await store.query("SELECT * FROM billing_orders WHERE id=$1", [
    first.orderId,
  ]);
  const order = remote(row);
  client.orders.set(row.id, order);
  await b.reconcile(row);
  await b.reconcile(row);
  assert.equal((await store.status("alice")).credits, 1);
  order.payments[0].refundStatus = "full";
  await b.reconcile(row);
  assert.equal((await store.status("alice")).credits, 0);
  order.testMode = false;
  await assert.rejects(b.reconcile(row), /identity mismatch/);
  order.testMode = true;
  order.merchantProvidedBuyerIdentity = "mallory";
  await assert.rejects(b.reconcile(row), /identity mismatch/);
});
test("Pancake webhook verifies raw signature, scope and replay window; HTTP rejects guests, CSRF and other orders", async (t) => {
  const store = await fixture(t),
    client = mockClient();
  const verifier = new WaffoPancake({
    ...billingConfig(env),
    webhookPublicKey: keys.publicKey.export({ type: "spki", format: "pem" }),
  });
  client.webhooks = verifier.webhooks;
  const b = createBilling(
    {},
    { local: true, origin: "https://example.com" },
    env,
    { store, client },
  );
  const pending = await b.checkout(
    { id: "alice", email: "alice@example.test" },
    "single",
  );
  const [row] = await store.query("SELECT * FROM billing_orders WHERE id=$1", [
    pending.orderId,
  ]);
  client.orders.set(row.id, remote(row));
  const accounts = {
    auth: {
      api: {
        getSession: async ({ headers }) =>
          headers.get("cookie") === "alice" ? { user: { id: "alice" } } : null,
      },
    },
  };
  const app = express();
  mountBilling(app, accounts, { origin: "https://example.com" }, b);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => new Promise((r) => server.close(r)));
  const base = `http://127.0.0.1:${server.address().port}/api/billing`;
  assert.equal((await fetch(`${base}/status`)).status, 401);
  const headers = {
    cookie: "alice",
    origin: "https://example.com",
    "content-type": "application/json",
  };
  assert.equal(
    (
      await fetch(`${base}/checkout`, {
        method: "POST",
        headers,
        body: JSON.stringify({ plan: "monthly" }),
      })
    ).status,
    400,
    "stale clients cannot create recurring subscriptions",
  );
  assert.equal(
    (
      await fetch(`${base}/checkout`, {
        method: "POST",
        headers,
        body: JSON.stringify({ plan: "monthpass" }),
      })
    ).status,
    200,
    "one-time month pass is available through the authenticated API",
  );
  assert.equal(
    (
      await fetch(`${base}/consume`, {
        method: "POST",
        headers: { ...headers, origin: "https://evil.example" },
        body: JSON.stringify({ downloadId: randomUUID() }),
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await fetch(`${base}/reconcile`, {
        method: "POST",
        headers,
        body: JSON.stringify({ orderId: "b".repeat(32) }),
      })
    ).status,
    404,
  );
  const notify = async (event, ts = Date.now(), valid = true) => {
    const body = JSON.stringify(event);
    const sig = valid
      ? sign("sha256", Buffer.from(`${ts}.${body}`), keys.privateKey).toString(
          "base64",
        )
      : "forged";
    return fetch(`${base}/webhook`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-waffo-signature": `t=${ts},v1=${sig}`,
      },
      body,
    });
  };
  const event = {
    id: "PAY_test",
    timestamp: new Date().toISOString(),
    eventType: "order.completed",
    eventId: "PAY_test",
    storeId: env.WAFFO_STORE_ID,
    mode: "test",
    data: { orderId: "ORD_test", orderMerchantExternalId: row.id },
  };
  assert.equal((await notify(event, Date.now(), false)).status, 401);
  assert.equal((await notify({ ...event, mode: "prod" })).status, 401);
  assert.equal((await notify({ ...event, storeId: "other" })).status, 401);
  assert.equal((await notify(event, Date.now() - 3600000)).status, 401);
  assert.equal((await notify(event)).status, 200);
  assert.equal((await notify(event)).status, 200);
  await b.processEvents();
  assert.equal((await store.status("alice")).credits, 1);
  const status = await fetch(`${base}/status`, {
    headers: { cookie: "alice" },
  });
  assert.equal(status.headers.get("cache-control"), "no-store");
  client.orders.get(row.id).payments[0].refundStatus = "full";
  assert.equal(
    (
      await notify({
        ...event,
        id: "REF_test",
        eventType: "refund.succeeded",
        timestamp: new Date().toISOString(),
      })
    ).status,
    200,
  );
  await b.processEvents();
  assert.equal((await store.status("alice")).credits, 0);
});

test("one-time month pass uses a stable calendar month, including leap days and short months", () => {
  for (const [start, end] of [
    ["2025-01-31T12:34:56Z", "2025-02-28T12:34:56Z"],
    ["2024-01-31T12:34:56Z", "2024-02-29T12:34:56Z"],
    ["2024-02-29T12:34:56Z", "2024-03-29T12:34:56Z"],
    ["2025-12-31T12:34:56Z", "2026-01-31T12:34:56Z"],
  ]) {
    const order = {
      status: "completed",
      payments: [{ ...payment("9.90"), createdAt: start }],
    };
    const expected = Date.parse(end);
    assert.equal(monthPassUntil(order, Date.parse(start)), expected);
    assert.equal(
      monthPassUntil(order, expected + 86400000),
      expected,
      "reconciliation cannot extend expired access",
    );
    assert.equal(
      monthPassUntil(order, Date.parse(start) - 1),
      0,
      "future payment cannot grant access",
    );
  }
  for (const change of [
    (o) => (o.status = "pending"),
    (o) => (o.payments[0].amount.display = "1.90"),
    (o) => (o.payments[0].amount.currency = "EUR"),
    (o) => (o.payments[0].status = "failed"),
    (o) => (o.payments[0].refundStatus = "full"),
    (o) => (o.payments[0].refundStatus = "pending"),
    (o) => (o.payments[0].isFullyRefunded = true),
    (o) => (o.payments[0].createdAt = "invalid"),
    (o) => (o.payments = []),
  ]) {
    const order = { status: "completed", payments: [payment("9.90")] };
    change(order);
    assert.equal(monthPassUntil(order), 0);
  }
});

test("month passes use one-time checkout; reconciliation is idempotent, refunds revoke access, expiry permits repurchase", async (t) => {
  const store = await fixture(t),
    client = mockClient();
  const b = createBilling(
    {},
    { local: true, origin: "https://example.com" },
    env,
    { store, client },
  );
  const user = { id: "alice", email: "alice@example.test" };
  await assert.rejects(b.checkout(user, "monthly"), /Invalid plan/);
  const first = await b.checkout(user, "monthpass");
  assert.equal(
    client.creates[0].params.productId,
    env.WAFFO_MONTH_PASS_PRODUCT_ID,
  );
  assert.equal(client.creates[0].params.withTrial, false);
  assert.equal(client.creates[0].params.metadata.plan, "monthpass");
  assert.equal((await b.checkout(user, "monthpass")).orderId, first.orderId);
  assert.equal(client.creates.length, 1);
  const [row] = await store.query("SELECT * FROM billing_orders WHERE id=$1", [
    first.orderId,
  ]);
  const order = remote(row, "monthpass");
  order.payments = [payment("9.90")];
  client.orders.set(row.id, order);
  await b.reconcile(row);
  const expiry = (await store.status(user.id)).unlimitedUntil;
  assert.ok(expiry > Date.now());
  assert.equal((await store.status(user.id)).hasSubscription, false);
  await b.reconcile(row);
  assert.equal((await store.status(user.id)).unlimitedUntil, expiry);
  await credit(store, "single-spare");
  for (let i = 0; i < 5; i++)
    assert.equal(await store.consume(user.id, randomUUID()), true);
  assert.equal((await store.status(user.id)).credits, 1);
  await assert.rejects(b.checkout(user, "monthpass"), /still active/);
  order.payments[0].refundStatus = "full";
  await b.reconcile(row);
  assert.equal((await store.status(user.id)).unlimitedUntil, 0);
  order.payments[0].refundStatus = "none";
  order.payments[0].createdAt = "2020-01-31T00:00:00Z";
  await b.reconcile(row);
  assert.ok((await store.status(user.id)).unlimitedUntil < Date.now());
  assert.equal(
    await store.consume(user.id, randomUUID()),
    true,
    "expired pass falls back to single credit",
  );
  assert.equal(await store.consume(user.id, randomUUID()), false);
  const second = await b.checkout(user, "monthpass");
  assert.notEqual(second.orderId, first.orderId);
  assert.equal(client.creates.length, 2);
});
