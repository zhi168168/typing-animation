import { createPrivateKey } from "node:crypto";

export function billingConfig(env) {
  if (!env.WAFFO_MERCHANT_ID || !env.WAFFO_PRIVATE_KEY) return null;
  const mode = {
    sandbox: "test",
    production: "prod",
    test: "test",
    prod: "prod",
  }[env.WAFFO_ENVIRONMENT || "test"];
  if (!mode) throw new Error("WAFFO_ENVIRONMENT must be test or prod");
  let key = env.WAFFO_PRIVATE_KEY.replaceAll("\\n", "\n").trim();
  if (!key.includes("BEGIN"))
    key = createPrivateKey({
      key: Buffer.from(key, "base64"),
      format: "der",
      type: "pkcs8",
    }).export({ type: "pkcs8", format: "pem" });
  return {
    merchantId: env.WAFFO_MERCHANT_ID,
    privateKey: key,
    environment: mode,
    storeId: env.WAFFO_STORE_ID || "",
    singleProductId: env.WAFFO_SINGLE_PRODUCT_ID || "",
    monthlyProductId: env.WAFFO_MONTHLY_PRODUCT_ID || "",
    // Product IDs are public catalog references, not credentials. Keep the old
    // subscription ID only to reconcile purchases made before the month pass.
    monthPassProductId:
      env.WAFFO_MONTH_PASS_PRODUCT_ID ||
      (env.WAFFO_STORE_ID === "STO_5ljWhy4WDd1PUstxt8TaVK"
        ? "PROD_3y1N1HyByVrrxr4WyTV83e"
        : ""),
  };
}
