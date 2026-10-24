# Logo and search favicon

The original artwork is `icon.png` in the project root. Keep it unchanged.
`scripts/brand-assets.py` (Python + Pillow) crops paper margins and creates transparent display logos, square white-background search/browser icons, an ICO, an Apple touch icon, and the branded 1200x630 sharing preview. `public/product-preview.png` is the preserved sharing-image base used for repeatable regeneration.

Visible branding appears in the home navigation/footer, editor home link, account navigation, and legal-page navigation. Display logos are 25–32 CSS pixels and adapt to light/dark themes. The artwork is raster; PNG preserves the supplied silhouette without claiming a vector conversion.

## Google Search

Official source, checked October 24, 2026:
https://developers.google.com/search/docs/appearance/favicon-in-search

- The **homepage HTML head** declares `/favicon-96.png` as `rel="icon"`, `type="image/png"`, `sizes="96x96"`. All page entry points use the same brand.
- It is square, larger than Google's current recommendation of 48x48, with a simple high-contrast mark. The current documented minimum is 8x8; multiples of 48 are not a current stated requirement.
- Googlebot must be able to fetch the homepage; Googlebot-Image must be able to fetch the image. Neither requires authentication. Production robots rules allow both resources.
- Keep the favicon URL stable. Each hostname has its own favicon; inspect the final canonical hostname and any www redirect after deployment.
- The former `/favicon.svg` URL remains available with updated artwork for cached pages/bookmarks; new declarations use PNG for Google compatibility.
- Organization logo structured data and the sharing image are additional brand consumers, **not substitutes** for the homepage favicon declaration.

## After production deployment

1. Verify `https://typing-animation.com/` is publicly accessible, indexable, and contains the favicon declaration in returned HTML.
2. Verify `https://typing-animation.com/favicon-96.png` returns 200 with `Content-Type: image/png` and an actual 96x96 PNG, not a login, challenge, HTML fallback, or 404.
3. Check live robots.txt, CDN/WAF access, and the final hostname, including Googlebot/Googlebot-Image access. A user-agent smoke check alone cannot prove actual Google network access.
4. In the site's Google Search Console property, inspect the homepage URL and request indexing/recrawling once. No special favicon submission API is required.
5. Allow days to weeks for recrawling and processing. Google's documentation explicitly does not guarantee display even when all requirements are met.

Local build verification is not proof of a production deployment or Google search-result appearance. Do not report either as completed without live evidence.
