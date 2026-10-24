(() => {
  // Keep local development and Vercel preview visits out of production reports.
  if (!["typing-animation.com", "www.typing-animation.com"].includes(location.hostname)) return;
  const measurementId = "G-FZKLY4DMFE";
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  // Account verification and reset URLs can contain private tokens.
  const pageURL = (value) => {
    try { const url = new URL(value); return url.origin + url.pathname; }
    catch { return ""; }
  };
  window.gtag("js", new Date());
  window.gtag("config", measurementId, {
    page_location: pageURL(location.href),
    page_referrer: pageURL(document.referrer),
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);
})();
