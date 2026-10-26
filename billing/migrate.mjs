import { loadEnv } from "vite";
import { accountConfig } from "../accounts/config.mjs";
import { createAccounts } from "../accounts/auth.mjs";
import { BillingStore } from "./store.mjs";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const config = accountConfig({
  ...env,
  DATABASE_URL: env.DIRECT_DATABASE_URL || env.DATABASE_URL,
});
if (!config) throw new Error("Configure accounts before migrating billing");
const service = await createAccounts(config);
try {
  await new BillingStore(service.database, config.local).migrate();
} finally {
  await service.close();
}
console.log("Billing schema is up to date.");
