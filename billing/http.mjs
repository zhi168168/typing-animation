import express from "express";
import { fromNodeHeaders } from "better-auth/node";
import { createHash } from "node:crypto";
import { waitUntil } from "@vercel/functions";

export function mountBilling(app, accounts, settings, billing) {
  app.use("/api/billing", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!billing)
      return res.status(503).json({
        error: "Payments are not available yet. Your project is saved.",
      });
    if (
      req.path !== "/webhook" &&
      req.headers.origin &&
      req.headers.origin !== settings.origin
    )
      return res.status(403).json({ error: "Origin is not allowed" });
    next();
  });
  app.post(
    "/api/billing/webhook",
    express.raw({ type: "application/json", limit: "256kb" }),
    async (req, res) => {
      let raw, event;
      try {
        if (!Buffer.isBuffer(req.body)) throw new Error("Raw JSON required");
        raw = req.body.toString("utf8");
        event = billing.client.webhooks.verify(
          raw,
          req.headers["x-waffo-signature"] || "",
          { environment: billing.config.environment },
        );
        if (
          event.mode !== billing.config.environment ||
          event.storeId !== billing.config.storeId
        )
          throw new Error("Webhook scope mismatch");
      } catch {
        return res.status(401).send("Invalid signature or environment");
      }
      try {
        // Persist before acknowledging: a cold start or background failure cannot lose a paid event.
        const id = createHash("sha256").update(raw).digest("hex");
        await billing.store.transaction("webhook-inbox", (query) =>
          query(
            "INSERT INTO billing_events(id,mode,body,created) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING RETURNING id",
            [id, event.mode, raw, Date.now()],
          ),
        );
        res.status(200).send("OK");
        const work = billing
          .processEvents()
          .catch(() =>
            console.error(
              "Payment event processing deferred; durable inbox retained",
            ),
          );
        if (process.env.VERCEL === "1") waitUntil(work);
      } catch {
        if (!res.headersSent) res.status(503).send("Retry later");
      }
    },
  );
  app.use(
    "/api/billing",
    express.json({ limit: "8kb" }),
    async (req, res, next) => {
      try {
        const session = await accounts.auth.api.getSession({
          headers: fromNodeHeaders(req.headers),
        });
        if (!session?.user?.id)
          return res.status(401).json({ error: "Sign in to continue" });
        if (req.method !== "GET" && req.headers.origin !== settings.origin)
          return res.status(403).json({ error: "Origin is required" });
        req.billingUser = session.user;
        next();
      } catch {
        res.status(503).json({ error: "Account service is unavailable" });
      }
    },
  );
  app.get("/api/billing/status", async (req, res, next) => {
    try {
      await billing.processEvents();
      await billing.refresh(req.billingUser.id);
      res.json(await billing.store.status(req.billingUser.id));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/billing/checkout", async (req, res, next) => {
    if (!["single", "monthpass"].includes(req.body.plan))
      return res.status(400).json({ error: "Invalid plan" });
    try {
      res.json(await billing.checkout(req.billingUser, req.body.plan));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/billing/reconcile", async (req, res, next) => {
    if (!/^[a-f0-9]{32}$/.test(req.body.orderId || ""))
      return res.status(400).json({ error: "Invalid order" });
    try {
      const [row] = await billing.store.query(
        "SELECT * FROM billing_orders WHERE id=$1 AND user_id=$2 AND mode=$3",
        [req.body.orderId, req.billingUser.id, billing.config.environment],
      );
      if (!row) return res.status(404).json({ error: "Order not found" });
      await billing.reconcile(row);
      res.json(await billing.store.status(req.billingUser.id));
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/billing/consume", async (req, res, next) => {
    if (!/^[a-f0-9-]{36}$/.test(req.body.downloadId || ""))
      return res.status(400).json({ error: "Invalid download" });
    try {
      await billing.processEvents();
      await billing.refresh(req.billingUser.id);
      if (
        !(await billing.store.consume(req.billingUser.id, req.body.downloadId))
      )
        return res
          .status(402)
          .json({ error: "Choose a download plan to continue." });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });
  app.post("/api/billing/manage", async (req, res, next) => {
    try {
      const result = await billing.manage(req.billingUser.id);
      res
        .set("Referrer-Policy", "no-referrer")
        .json({ url: result.managementUrl });
    } catch (e) {
      next(e);
    }
  });
  app.use("/api/billing", (error, req, res, next) => {
    if (res.headersSent) return next(error);
    res.status(error.type === "entity.too.large" ? 413 : 503).json({
      error:
        "Payment service could not complete the request. Please retry; your order is kept to prevent duplicate charges.",
    });
  });
}
