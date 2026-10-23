import express from "express";
import { accountConfig } from "./config.mjs";
import { createAccounts } from "./auth.mjs";
import { capabilities, mountAccounts } from "./http.mjs";

export function createVercelHandler({
  env = process.env,
  createRuntime = createAccounts,
} = {}) {
  let runtime;
  async function initialize(config) {
    let service;
    try {
      service = await createRuntime(config);
      await service.auth.$context;
      const app = express();
      mountAccounts(app, config, service, { vercel: env.VERCEL === "1" });
      return app;
    } catch {
      await service?.close().catch(() => {});
      throw new Error("Account initialization failed");
    }
  }
  return async (req, res) => {
    res.setHeader("Cache-Control", "no-store");
    let config;
    try {
      config = accountConfig(env);
      if (config?.local) config = null;
    } catch {
      config = null;
    }
    if (req.method === "GET" && req.url.split("?")[0] === "/api/auth/config") {
      res.setHeader("Content-Type", "application/json");
      return res.end(JSON.stringify(capabilities(config)));
    }
    if (!config || config.local) {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      return res.end(
        JSON.stringify({ message: "Accounts are not configured yet" }),
      );
    }
    try {
      runtime ||= initialize(config).catch((error) => {
        runtime = undefined;
        throw error;
      });
      return (await runtime)(req, res);
    } catch {
      res.statusCode = 503;
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          message: "Account service is temporarily unavailable",
        }),
      );
    }
  };
}

export default createVercelHandler();
