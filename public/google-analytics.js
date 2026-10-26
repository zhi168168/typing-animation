(() => {
  if (!["typing-animation.com", "www.typing-animation.com"].includes(location.hostname)) return;
  const measurementId = "G-FZKLY4DMFE";
  const choiceKey = "typing-animation-analytics-consent-v1";
  let loaded = false;
  let editorViewSent = false;
  let choice = null;
  try { choice = localStorage.getItem(choiceKey); } catch {}
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  const pageURL = (value, withCampaign = false) => {
    try {
      const url = new URL(value);
      const clean = new URL(url.origin + url.pathname);
      if (withCampaign) {
        for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_id", "utm_content", "utm_term"]) {
          const tag = url.searchParams.get(key);
          // Never forward arbitrary queries, account/payment tokens or email addresses.
          if (tag && /^[a-zA-Z0-9_.~ -]{1,100}$/.test(tag)) clean.searchParams.set(key, tag);
        }
      }
      return clean.href;
    }
    catch { return ""; }
  };
  const isEditor = () => ["/editor", "/editor/", "/editor.html"].includes(new URL(location.href).pathname);
  function trackEditorEvent(name) {
    if (choice !== "allowed" || !loaded || !isEditor()) return;
    window.gtag("event", name, {
      page_path: "/editor",
      ...(name === "export_animation_click" ? { button_location: "editor_toolbar" } : {}),
    });
  }
  function startAnalytics() {
    window[`ga-disable-${measurementId}`] = false;
    if (loaded) return;
    loaded = true;
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      page_location: pageURL(location.href, true),
      page_referrer: pageURL(document.referrer),
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
    });
    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script);
    if (isEditor() && !editorViewSent) {
      editorViewSent = true;
      trackEditorEvent("editor_view");
    }
  }
  function clearAnalyticsCookies() {
    for (const part of document.cookie.split(";")) {
      const name = part.trim().split("=")[0];
      if (!/^_ga($|_)|^_gid$|^_gat($|_)/.test(name)) continue;
      for (const domain of ["", location.hostname, ".typing-animation.com"]) {
        document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax${domain ? `; Domain=${domain}` : ""}`;
      }
    }
  }
  function setChoice(value) {
    choice = value;
    try { localStorage.setItem(choiceKey, value); } catch {}
    if (value === "allowed") startAnalytics();
    else {
      window[`ga-disable-${measurementId}`] = true;
      clearAnalyticsCookies();
    }
    document.getElementById("privacy-choice-panel")?.remove();
  }
  function showSettings() {
    if (document.getElementById("privacy-choice-panel")) return;
    const panel = document.createElement("section");
    panel.id = "privacy-choice-panel";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Privacy choices");
    panel.style.cssText = "position:fixed;bottom:20px;left:16px;right:16px;max-width:540px;margin:0 auto;padding:20px;border:1px solid #777;background:#17171b;color:#fff;border-radius:12px;z-index:2147483647;box-shadow:0 8px 40px #0008;font:14px/1.6 system-ui;box-sizing:border-box";
    const text = document.createElement("p");
    text.textContent = "We use essential storage for sign-in and saved projects. Optional Google Analytics helps us understand website visits. Choose whether to allow it.";
    text.style.margin = "0 0 12px";
    panel.appendChild(text);
    for (const [label, value] of [["Essential only", "denied"], ["Allow analytics", "allowed"]]) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.style.cssText = "background:#fff;color:#17171b;border:1px solid #aaa;border-radius:6px;padding:9px 12px;margin:0 8px 8px 0;cursor:pointer;font:inherit";
      button.addEventListener("click", () => setChoice(value));
      panel.appendChild(button);
    }
    const link = document.createElement("a");
    link.href = "/privacy.html";
    link.textContent = "Privacy policy";
    link.style.cssText = "color:#d4c6ff;white-space:nowrap";
    panel.appendChild(link);
    document.body.appendChild(panel);
  }
  document.addEventListener("click", (event) => {
    if (event.target.closest?.("[data-privacy-settings]")) showSettings();
    const button = event.target.closest?.('[data-analytics-event="export_animation_click"]');
    if (button && !button.disabled) trackEditorEvent("export_animation_click");
  });
  if (choice === "allowed") startAnalytics();
  else window[`ga-disable-${measurementId}`] = true;
  const initialize = () => {
    if (!document.querySelector("[data-privacy-settings]")) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = "Privacy settings";
      button.setAttribute("data-privacy-settings", "");
      button.style.cssText = "position:fixed;bottom:8px;right:10px;z-index:1000;background:#202024;color:#ddd;border:1px solid #666;border-radius:6px;padding:5px 9px;font:12px system-ui;cursor:pointer";
      document.body.appendChild(button);
    }
    if (choice !== "allowed" && choice !== "denied") showSettings();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initialize, { once: true });
  else initialize();
})();
