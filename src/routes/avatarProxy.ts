import express from "express";
import { fetch } from "undici";
const router = express.Router();

router.get("/api/v1/avatar/proxy", async (req, res) => {
  try {
    const url = String(req.query.url || "");
    if (!url) return res.status(400).json({ error: "missing url" });

    // optional: whitelist hostnames to avoid open-proxy
    const u = new URL(url);
    const allowedHosts = ["lh3.googleusercontent.com", "www.gravatar.com"];
    if (!allowedHosts.includes(u.hostname)) {
      return res.status(403).json({ error: "not allowed host" });
    }

    const r = await fetch(url);
    if (!r.ok) return res.status(404).json({ error: "remote not found" });

    // copy content-type and cache headers
    const ct = r.headers.get("content-type") || "image/jpeg";
    res.setHeader("content-type", ct);
    res.setHeader("cache-control", "public, max-age=86400");
    // pipe readable stream to express response
    // @ts-ignore - node stream
    r.body.pipe(res);
  } catch (err) {
    console.error("avatar proxy", err);
    res.status(500).json({ error: "proxy failed" });
  }
});

export default router;
