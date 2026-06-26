#!/usr/bin/env node
/**
 * CarDost — prebuild sitemap generator.
 *
 * Runs automatically before `yarn build` (via the "prebuild" npm script).
 * Fetches the live, DB-backed sitemap from the backend and writes it to
 * `public/sitemap.xml`, so it is served at https://cardost.in/sitemap.xml
 * by CRA/nginx — not under /api/, which is disallowed by robots.txt.
 *
 * Fallback behaviour:
 *   - If the backend is unreachable at build time, we KEEP the existing
 *     public/sitemap.xml so we never deploy with a missing sitemap.
 *   - If nothing exists yet, we write a minimal hardcoded sitemap of the
 *     static pages so Googlebot at least gets a valid file.
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const http = require("http");

const SITE = process.env.SITE_URL || "https://cardost.in";
// During build inside the frontend container the public URL works; on Emergent's
// build runner the same URL is reachable too.
const BACKEND = (process.env.REACT_APP_BACKEND_URL || SITE).replace(/\/+$/, "");
const SOURCE_URL = `${BACKEND}/api/seo/sitemap.xml`;
const OUT_PATH = path.join(__dirname, "..", "public", "sitemap.xml");

function fetchXml(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { headers: { "User-Agent": "cardost-sitemap-generator" } }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchXml(res.headers.location));
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from ${url}`));
      }
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => resolve(body));
    });
    req.on("error", reject);
    req.setTimeout(8000, () => req.destroy(new Error("Timeout fetching sitemap source")));
  });
}

function writeMinimalFallback() {
  const today = new Date().toISOString().slice(0, 10);
  const pages = [
    ["", "1.0", "daily"],
    ["shop", "0.9", "daily"],
    ["track-order", "0.6", "monthly"],
    ["contact", "0.6", "monthly"],
    ["about", "0.5", "monthly"],
    ["faq", "0.5", "monthly"],
    ["reviews", "0.5", "weekly"],
  ];
  const urls = pages
    .map(([p, prio, freq]) => {
      const loc = p ? `${SITE}/${p}` : `${SITE}/`;
      return `  <url><loc>${loc}</loc><lastmod>${today}</lastmod><changefreq>${freq}</changefreq><priority>${prio}</priority></url>`;
    })
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
  fs.writeFileSync(OUT_PATH, xml, "utf8");
}

(async () => {
  try {
    const xml = await fetchXml(SOURCE_URL);
    if (!/^<\?xml/.test(xml.trim()) || !xml.includes("<urlset")) {
      throw new Error("Backend response is not a valid sitemap XML");
    }
    // Rewrite every <loc> to the canonical SITE host and ensure a trailing
    // slash for bare-host URLs (so home is `https://cardost.in/`, not
    // `https://cardost.in`). Using a callback avoids regex-escaping bugs
    // and prevents the earlier `[^/]+` greediness that consumed `<` of `</loc>`.
    const rewritten = xml.replace(/<loc>([^<]*)<\/loc>/g, (_, raw) => {
      let url = raw.replace(/^https?:\/\/[^\/]+/, SITE);
      if (url === SITE) url = SITE + "/";
      return `<loc>${url}</loc>`;
    });
    fs.writeFileSync(OUT_PATH, rewritten, "utf8");
    const urlCount = (rewritten.match(/<url>/g) || []).length;
    console.log(`[sitemap] wrote ${urlCount} URLs to public/sitemap.xml (source: ${SOURCE_URL})`);
  } catch (err) {
    if (fs.existsSync(OUT_PATH)) {
      console.warn(`[sitemap] ${err.message} — keeping existing public/sitemap.xml`);
    } else {
      writeMinimalFallback();
      console.warn(`[sitemap] ${err.message} — wrote minimal fallback sitemap (static pages only)`);
    }
  }
})();
