import { loadEnv } from "vite";
import { accountConfig } from "./config.mjs";
import { createAccounts } from "./auth.mjs";
const env = { ...loadEnv("production", process.cwd(), ""), ...process.env };
const config = accountConfig({
  ...env,
  DATABASE_URL: env.DIRECT_DATABASE_URL || env.DATABASE_URL,
});
if (!config)
  throw new Error("Configure ACCOUNT_ORIGIN before migrating accounts");
const service = await createAccounts(config, { migrate: true });
await service.close();
console.log("Typing Animation account schema is up to date.");
