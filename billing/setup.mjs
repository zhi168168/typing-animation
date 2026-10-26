import { loadEnv } from "vite";
import { readFile, writeFile } from "node:fs/promises";
import { WaffoPancake } from "@waffo/pancake-ts";
import { billingConfig } from "./config.mjs";

const env = { ...loadEnv("development", process.cwd(), ""), ...process.env };
const config = billingConfig(env);
if (!config || config.environment !== "test")
  throw new Error("Setup requires test credentials");
const client = new WaffoPancake(config);
const storeId = env.WAFFO_STORE_ID || "STO_5ljWhy4WDd1PUstxt8TaVK";
const response = await client.graphql.query({
  query: `query($storeId:String!) { store(id:$storeId) {
    id name prodEnabled
    onetimeProducts { id name status prices {currency priceInfo {amount taxCategory}} }
    subscriptionProducts { id name status billingPeriod prices {currency priceInfo {amount taxCategory trialAmount}} }
  } }`,
  variables: { storeId },
});
if (response.errors?.length || !response.data?.store)
  throw new Error("Cannot read selected store");
const store = response.data.store;
const matches = (product, amount) =>
  product.status === "active" &&
  product.prices.some(
    (p) => p.currency === "USD" && Number(p.priceInfo.amount) === amount,
  );
let single = store.onetimeProducts.find((p) => matches(p, 1.9));
if (!single)
  ({ product: single } = await client.onetimeProducts.create(
    {
      storeId,
      name: "Typing Animation — One Download",
      description:
        "One animation file download in MP4, WebM, HTML or PNG format.",
      prices: { USD: { amount: "1.90", taxCategory: "digital_goods" } },
      metadata: { app: "typeflow", plan: "single" },
    },
    { idempotencyKey: `${config.merchantId}-typeflow-single-v1` },
  ));
let monthly = store.subscriptionProducts.find(
  (p) =>
    p.billingPeriod === "monthly" &&
    matches(p, 9.9) &&
    !Number(p.prices.find((x) => x.currency === "USD")?.priceInfo.trialAmount),
);
if (!monthly)
  ({ product: monthly } = await client.subscriptionProducts.create(
    {
      storeId,
      name: "Typing Animation — Unlimited Monthly",
      description:
        "Unlimited animation downloads during each paid month. Renews monthly; cancel anytime.",
      billingPeriod: "monthly",
      prices: { USD: { amount: "9.90", taxCategory: "saas" } },
      metadata: { app: "typeflow", plan: "monthly" },
    },
    { idempotencyKey: `${config.merchantId}-typeflow-monthly-v1` },
  ));
// Preserve every secret and existing unrelated local setting. Canonicalize duplicate env keys.
const file = ".env.local";
let text = await readFile(file, "utf8");
const updates = {
  WAFFO_ENVIRONMENT: "test",
  WAFFO_STORE_ID: storeId,
  WAFFO_SINGLE_PRODUCT_ID: single.id,
  WAFFO_MONTHLY_PRODUCT_ID: monthly.id,
};
for (const [key, value] of Object.entries(updates)) {
  text = text
    .split(/\r?\n/)
    .filter((line) => !new RegExp(`^${key}=`).test(line))
    .join("\n");
  text += `\n${key}=${value}`;
}
await writeFile(file, text.trimEnd() + "\n");
console.log(
  JSON.stringify({
    mode: "test",
    store: store.name,
    storeId,
    single: single.id,
    monthly: monthly.id,
    productionEnabled: store.prodEnabled,
  }),
);
