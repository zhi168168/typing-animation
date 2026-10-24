export function siteURL(value = "") {
  if (!value.trim()) return "";
  const url = new URL(value);
  if (
    !["https:", "http:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new Error(
      "SITE_URL must be an http(s) origin, such as https://your-domain.com",
    );
  return url.origin;
}

const escapeAttribute = (value) =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;");

export function applySiteMetadata(html, origin, pathname = "/") {
  // Both the build and runtime use this marker; runtime can override a build URL.
  html = html
    .replace(/\s*<(?:link|meta)\b[^>]*data-site="true"[^>]*>/g, "")
    .replace(/\s*<script\b[^>]*data-site="true"[^>]*>[\s\S]*?<\/script>/g, "");
  if (!origin) return html;
  const url = escapeAttribute(`${origin}${pathname}`);
  const image = escapeAttribute(`${origin}/typing-animation-generator.png`);
  const schema = JSON.stringify({
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Typing Animation",
    url: `${origin}/`,
    inLanguage: "en",
  }).replaceAll("<", "\\u003c");
  return html.replace(
    "<!-- site-metadata -->",
    `<!-- site-metadata -->
    <link data-site="true" rel="canonical" href="${url}" />
    <meta data-site="true" property="og:url" content="${url}" />
    <meta data-site="true" property="og:image" content="${image}" />
    <meta data-site="true" property="og:image:width" content="1200" />
    <meta data-site="true" property="og:image:height" content="630" />
    <meta data-site="true" property="og:image:alt" content="Typing Animation typing animation generator with font, timing and export controls" />
    <meta data-site="true" name="twitter:image" content="${image}" />
    <meta data-site="true" name="twitter:image:alt" content="Typing Animation typing animation generator with font, timing and export controls" />
    <script data-site="true" type="application/ld+json">${schema}</script>`,
  );
}

export function robots(origin) {
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /work/\n${origin ? `\nSitemap: ${origin}/sitemap.xml\n` : ""}`;
}

export function sitemap(origin) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${escapeAttribute(origin)}/</loc></url><url><loc>${escapeAttribute(origin)}/editor</loc></url></urlset>\n`;
}
