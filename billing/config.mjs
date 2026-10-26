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
  };
}
