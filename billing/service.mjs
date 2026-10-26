import { WaffoPancake } from "@waffo/pancake-ts";
import { randomUUID } from "node:crypto";
import { BillingStore } from "./store.mjs";
import { billingConfig } from "./config.mjs";
export { billingConfig } from "./config.mjs";

export const plans = {
  single: { amount: "1.90", name: "One animation download" },
  monthpass: { amount: "9.90", name: "One month of unlimited downloads" },
};
export function checkoutURL(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.username || url.password)
    throw new Error("Invalid checkout URL");
  return url.href;
}
// GraphQL Money.amount is in minor units; Money.display is already in USD dollars.
function paid(payment, amount) {
  return (
    payment.status === "succeeded" &&
    !payment.isFullyRefunded &&
    ["none", "failed"].includes(payment.refundStatus) &&
    payment.amount?.currency === "USD" &&
    Number(payment.amount?.display) === Number(amount)
  );
}
export function subscriptionUntil(order, now = Date.now()) {
  const start = Date.parse(order.currentPeriodStart),
    end = Date.parse(order.currentPeriodEnd);
  if (
    !["active", "canceling"].includes(order.status) ||
    order.billingPeriod !== "monthly" ||
    order.isInTrial ||
    !(start <= now && end > now) ||
    !Number.isInteger(order.currentPeriodNumber) ||
    order.currentPeriodNumber < 1
  )
    return 0;
  return order.payments?.some(
    (p) => p.periodNumber === order.currentPeriodNumber && paid(p, "9.90"),
  )
    ? end
    : 0;
}
// Calendar month in UTC, clamped to the last day of the following month.
// Anchor to Waffo's successful payment record, so retries/reconciliation never
// extend access and a delayed webhook does not create a fresh month.
export function monthPassUntil(order, now = Date.now()) {
  if (order.status !== "completed") return 0;
  const timestamps = (order.payments || [])
    .filter((p) => paid(p, "9.90"))
    .map((p) => Date.parse(p.createdAt))
    .filter((time) => Number.isFinite(time) && time <= now);
  if (!timestamps.length) return 0;
  const date = new Date(Math.min(...timestamps));
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0),
  ).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return date.getTime();
}
export const orderFields = `id storeId status currency testMode merchantProvidedBuyerIdentity orderMerchantExternalId
  productVersion {productId} payments {id status periodNumber refundStatus isFullyRefunded createdAt amount {display currency}}
`;
export function orderQuery(plan) {
  const type = plan === "monthly" ? "subscriptionOrders" : "onetimeOrders";
  return `query($storeId:String!, $ref:String!) { ${type}(storeId:$storeId, filter:{orderMerchantExternalId:{eq:$ref}},limit:2) {
    ${orderFields} ${plan === "monthly" ? "billingPeriod isInTrial currentPeriodStart currentPeriodEnd currentPeriodNumber" : ""}
  } }`;
}
export function createBilling(accounts, settings, env, options = {}) {
  const config = billingConfig(env);
  if (
    !config ||
    !accounts ||
    !config.storeId ||
    !config.singleProductId ||
    !config.monthPassProductId
  )
    return null;
  const client = options.client || new WaffoPancake(config);
  const store =
    options.store ||
    new BillingStore(accounts.database, settings.local, config.environment);
  const service = {
    config,
    client,
    store,
    async reconcile(row) {
      if (row.mode !== config.environment)
        throw new Error("Payment environment mismatch");
      return store.transaction(row.user_id, async (query) => {
        const result = await client.graphql.query({
          query: orderQuery(row.plan),
          variables: { storeId: config.storeId, ref: row.id },
        });
        if (result.errors?.length || !result.data)
          throw new Error("Payment query failed");
        const rows =
          result.data[
            row.plan === "monthly" ? "subscriptionOrders" : "onetimeOrders"
          ];
        if (!rows?.length) return null;
        if (rows.length !== 1) throw new Error("Ambiguous payment reference");
        const order = rows[0];
        if (
          order.storeId !== config.storeId ||
          order.testMode !== (config.environment === "test") ||
          order.merchantProvidedBuyerIdentity !== row.user_id ||
          order.orderMerchantExternalId !== row.id ||
          order.productVersion?.productId !== row.product_id ||
          order.currency !== "USD"
        )
          throw new Error("Payment identity mismatch");
        const valid =
          row.plan === "monthly"
            ? subscriptionUntil(order)
            : row.plan === "monthpass"
              ? monthPassUntil(order)
              : 0;
        const credited =
          row.plan === "single" &&
          order.status === "completed" &&
          order.payments?.some((p) => paid(p, "1.90"));
        await query(
          "UPDATE billing_orders SET provider_id=$1,state=$2,paid=$3,valid_until=$4 WHERE id=$5 RETURNING id",
          [order.id, order.status, credited ? 1 : 0, valid, row.id],
        );
        return order;
      });
    },
    async checkout(user, plan) {
      if (!plans[plan]) throw new Error("Invalid plan");
      await service.refresh(user.id);
      const order = await store.transaction(user.id, async (query) => {
        const rows = await query(
          "SELECT * FROM billing_orders WHERE user_id=$1 AND mode=$2 ORDER BY created DESC",
          [user.id, config.environment],
        );
        if (
          plan === "monthpass" &&
          rows.some(
            (r) =>
              ["monthly", "monthpass"].includes(r.plan) &&
              Number(r.valid_until) > Date.now(),
          )
        )
          throw new Error(
            "Your unlimited access is still active. Buy another month after it expires.",
          );
        let row = rows.find(
          (r) =>
            r.plan === plan &&
            r.product_id ===
              (plan === "single"
                ? config.singleProductId
                : config.monthPassProductId) &&
            r.state === "pending" &&
            (Number(r.session_expires) > Date.now() || !r.checkout_url),
        );
        if (row?.checkout_url)
          return { url: row.checkout_url, orderId: row.id };
        if (!row) {
          row = { id: randomUUID().replaceAll("-", ""), created: Date.now() };
          await query(
            "INSERT INTO billing_orders(id,user_id,plan,created,mode,product_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
            [
              row.id,
              user.id,
              plan,
              row.created,
              config.environment,
              plan === "single"
                ? config.singleProductId
                : config.monthPassProductId,
            ],
          );
        }
        return { orderId: row.id };
      });
      if (order.url) return order;
      const result = await client.checkout.authenticated.create(
        {
          productId:
            plan === "single"
              ? config.singleProductId
              : config.monthPassProductId,
          currency: "USD",
          buyerIdentity: user.id,
          buyerEmail: user.email,
          withTrial: false,
          orderMerchantExternalId: order.orderId,
          metadata: { app: "typeflow", plan, internalOrderId: order.orderId },
          successUrl: `${settings.origin}/editor?payment=${order.orderId}`,
          expiresInSeconds: 3600,
        },
        { idempotencyKey: `${config.merchantId}-checkout-${order.orderId}` },
      );
      const url = checkoutURL(result.checkoutUrl);
      await store.query(
        "UPDATE billing_orders SET checkout_url=$1,session_expires=$2 WHERE id=$3 RETURNING id",
        [url, Date.parse(result.expiresAt), order.orderId],
      );
      return { url, orderId: order.orderId };
    },
    async refresh(userId) {
      const rows = await store.query(
        "SELECT * FROM billing_orders WHERE user_id=$1 AND mode=$2 AND (state='pending' OR plan IN ('monthly','monthpass')) ORDER BY created DESC",
        [userId, config.environment],
      );
      for (const row of rows) await service.reconcile(row);
    },
    async processEvents() {
      const events = await store.query(
        "SELECT * FROM billing_events WHERE processed=0 AND mode=$1 ORDER BY created LIMIT 30",
        [config.environment],
      );
      for (const saved of events) {
        const event = JSON.parse(saved.body);
        const ref =
          event.data?.orderMerchantExternalId ||
          event.data?.orderMetadata?.internalOrderId;
        const providerId = event.data?.orderId || "";
        const rows = await store.query(
          "SELECT * FROM billing_orders WHERE mode=$1 AND (id=$2 OR provider_id=$3)",
          [config.environment, ref || "", providerId],
        );
        for (const row of rows) await service.reconcile(row);
        await store.query(
          "UPDATE billing_events SET processed=1 WHERE id=$1 RETURNING id",
          [saved.id],
        );
      }
    },
    async manage(userId) {
      const result = await client.auth.createCustomerPortalLink({
        storeId: config.storeId,
        buyerIdentity: userId,
      });
      return { managementUrl: checkoutURL(result.portalUrl) };
    },
  };
  return service;
}
