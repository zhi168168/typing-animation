import { fromNodeHeaders } from "better-auth/node";

export function exportAccess(service, jobs, billing = undefined) {
  return async (req, res, next) => {
    res.set("Cache-Control", "no-store");
    if (!service)
      return res.status(503).json({ error: "Sign-in service is unavailable" });
    try {
      const session = await service.auth.api.getSession({
        headers: fromNodeHeaders(req.headers),
      });
      if (!session?.user?.id)
        return res
          .status(401)
          .json({ error: "Sign in to download your animation" });
      req.exportUserId = session.user.id;
      const id = req.path.split("/").filter(Boolean)[0];
      if (id && jobs.get(id)?.userId !== session.user.id)
        return res.status(404).json({ error: "Export not found" });
      if (billing !== undefined && req.method !== "DELETE") {
        if (!billing)
          return res.status(503).json({ error: "Payments are unavailable" });
        const status = await billing.store.status(session.user.id);
        if (
          status.credits < 1 &&
          status.unlimitedUntil <= Date.now() &&
          !jobs.get(id)?.paid
        )
          return res
            .status(402)
            .json({ error: "Choose a download plan to continue" });
      }
      next();
    } catch {
      res.status(503).json({ error: "Sign-in service is unavailable" });
    }
  };
}
