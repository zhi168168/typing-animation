import { fromNodeHeaders } from "better-auth/node";

export function exportAccess(service, jobs) {
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
      next();
    } catch {
      res.status(503).json({ error: "Sign-in service is unavailable" });
    }
  };
}
