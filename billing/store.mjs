export class BillingStore {
  constructor(database, local = false, mode = "test") {
    this.database = database;
    this.local = local;
    this.mode = mode;
    this.queue = Promise.resolve();
  }
  async query(sql, values = [], db = this.database) {
    if (this.local)
      return db.prepare(sql.replace(/\$\d+/g, "?")).all(...values);
    return (await db.query(sql, values)).rows;
  }
  async migrate() {
    for (const sql of [
      `CREATE TABLE IF NOT EXISTS billing_orders (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, plan TEXT NOT NULL,
        provider_id TEXT, checkout_url TEXT, state TEXT NOT NULL DEFAULT 'pending',
        paid INTEGER NOT NULL DEFAULT 0, consumed_by TEXT,
        valid_until BIGINT NOT NULL DEFAULT 0, created BIGINT NOT NULL)`,
      `CREATE INDEX IF NOT EXISTS billing_orders_user ON billing_orders(user_id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS billing_orders_provider ON billing_orders(provider_id)`,
      `CREATE TABLE IF NOT EXISTS billing_downloads (
        id TEXT PRIMARY KEY, user_id TEXT NOT NULL, created BIGINT NOT NULL,
        mode TEXT NOT NULL DEFAULT 'test')`,
      `CREATE TABLE IF NOT EXISTS billing_events (
        id TEXT PRIMARY KEY, mode TEXT NOT NULL, body TEXT NOT NULL,
        processed INTEGER NOT NULL DEFAULT 0, created BIGINT NOT NULL)`,
    ]) {
      if (this.local) this.database.exec(sql);
      else await this.database.query(sql);
    }
    for (const [table, name, definition] of [
      ["billing_orders", "mode", "TEXT NOT NULL DEFAULT 'test'"],
      ["billing_orders", "product_id", "TEXT"],
      ["billing_orders", "session_expires", "BIGINT NOT NULL DEFAULT 0"],
      ["billing_downloads", "mode", "TEXT NOT NULL DEFAULT 'test'"],
    ]) {
      if (this.local) {
        if (
          !this.database
            .prepare(`PRAGMA table_info(${table})`)
            .all()
            .some((x) => x.name === name)
        )
          this.database.exec(
            `ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`,
          );
      } else
        await this.database.query(
          `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS ${name} ${definition}`,
        );
    }
  }
  async transaction(userId, action) {
    if (this.local) {
      const run = this.queue.then(async () => {
        this.database.exec("BEGIN IMMEDIATE");
        try {
          const result = await action((s, p) => this.query(s, p));
          this.database.exec("COMMIT");
          return result;
        } catch (error) {
          this.database.exec("ROLLBACK");
          throw error;
        }
      });
      this.queue = run.catch(() => {});
      return run;
    }
    const client = await this.database.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtextextended($1, 0))",
        [userId],
      );
      const result = await action((s, p) => this.query(s, p, client));
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  async status(userId) {
    const rows = await this.query(
      "SELECT * FROM billing_orders WHERE user_id=$1 AND mode=$2",
      [userId, this.mode],
    );
    return {
      credits: rows.filter(
        (r) => r.plan === "single" && r.paid === 1 && !r.consumed_by,
      ).length,
      unlimitedUntil: Math.max(
        0,
        ...rows
          .filter((r) => ["monthly", "monthpass"].includes(r.plan))
          .map((r) => Number(r.valid_until)),
      ),
      hasSubscription: rows.some(
        (r) =>
          r.plan === "monthly" &&
          r.provider_id &&
          ["active", "canceling", "past_due"].includes(r.state),
      ),
      mode: this.mode,
    };
  }
  async consume(userId, downloadId) {
    return this.transaction(userId, async (query) => {
      const [existing] = await query(
        "SELECT * FROM billing_downloads WHERE id=$1",
        [downloadId],
      );
      if (existing)
        return existing.user_id === userId && existing.mode === this.mode;
      const rows = await query(
        "SELECT * FROM billing_orders WHERE user_id=$1 AND mode=$2",
        [userId, this.mode],
      );
      if (
        !rows.some(
          (r) =>
            ["monthly", "monthpass"].includes(r.plan) &&
            Number(r.valid_until) > Date.now(),
        )
      ) {
        const credit = rows.find(
          (r) => r.plan === "single" && r.paid === 1 && !r.consumed_by,
        );
        if (!credit) return false;
        await query(
          "UPDATE billing_orders SET consumed_by=$1 WHERE id=$2 RETURNING id",
          [downloadId, credit.id],
        );
      }
      await query(
        "INSERT INTO billing_downloads(id,user_id,created,mode) VALUES($1,$2,$3,$4) RETURNING id",
        [downloadId, userId, Date.now(), this.mode],
      );
      return true;
    });
  }
}
