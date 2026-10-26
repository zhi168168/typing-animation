import React, { useEffect, useState } from "react";
import { billingAPI } from "./billing.js";
import { requireDownloadSession } from "./download-access.js";
import "./billing.css";

export function BillingPanel({ beforeCheckout, onError }) {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  useEffect(() => {
    let active = true;
    const orderId = new URLSearchParams(location.search).get("payment");
    const refresh = () =>
      (orderId && /^[a-f0-9]{32}$/.test(orderId)
        ? billingAPI("reconcile", { orderId })
        : billingAPI("status")
      )
        .then((value) => {
          if (active) {
            setStatus(value);
            setMessage("");
          }
        })
        .catch((error) => {
          if (active && error.code !== "SIGN_IN_REQUIRED")
            setMessage(error.message);
        });
    refresh();
    let attempts = 0;
    const timer = setInterval(
      () => {
        if (orderId && ++attempts >= 12) {
          clearInterval(timer);
          return;
        }
        refresh();
      },
      orderId ? 5000 : 30000,
    );
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function checkout(plan) {
    setBusy(true);
    setMessage("");
    try {
      beforeCheckout?.();
      await requireDownloadSession();
      const result = await billingAPI(
        plan === "manage" ? "manage" : "checkout",
        plan === "manage" ? {} : { plan },
      );
      location.assign(result.url);
    } catch (error) {
      setMessage(
        error.code === "SIGN_IN_REQUIRED"
          ? "Sign in to choose a download plan."
          : error.message,
      );
      onError?.(error);
      setBusy(false);
    }
  }
  const unlimited = status?.unlimitedUntil > Date.now();
  return (
    <section className="billing-panel" aria-label="Download plans">
      {status?.mode === "test" && (
        <p role="status">Test mode — no real charges.</p>
      )}
      <div className="billing-heading">
        <strong>Download plans</strong>
        <span>
          {unlimited
            ? `Unlimited until ${new Date(status.unlimitedUntil).toLocaleDateString()}`
            : status?.credits
              ? `${status.credits} download${status.credits === 1 ? "" : "s"} available`
              : "Edit and preview for free"}
        </span>
      </div>
      {!unlimited && (
        <label className="billing-consent">
          <input type="checkbox" checked={agreed} onChange={(event) => setAgreed(event.target.checked)} />
          <span>I agree to the <a href="/terms.html" target="_blank" rel="noopener">Terms</a> and acknowledge the <a href="/privacy.html" target="_blank" rel="noopener">Privacy Policy</a>. If I choose monthly, I authorize $9.90 USD each month until I cancel. Applicable taxes are shown at checkout.</span>
        </label>
      )}
      {!unlimited && (
        <div className="billing-plans">
          <button
            type="button"
            disabled={busy || !agreed}
            onClick={() => checkout("single")}
          >
            <strong>
              $1.90 <small>/ download</small>
            </strong>
            <span>One file · one-time payment</span>
          </button>
          <button
            type="button"
            disabled={busy || !agreed || status?.hasSubscription}
            onClick={() => checkout("monthly")}
          >
            <strong>
              $9.90 <small>/ month</small>
            </strong>
            <span>Unlimited downloads · renews monthly</span>
          </button>
        </div>
      )}
      <p>
        MP4, WebM, HTML and PNG. Monthly subscriptions renew automatically;
        cancel through Manage subscription.
      </p>
      <p>First subscription: full refund on request within 7 days. Unused single download: refundable within 7 days. <a href="/terms.html#refunds">Full refund policy</a> · <a href="/pricing.html">Compare plans</a></p>
      {status?.hasSubscription && (
        <button
          className="billing-manage"
          disabled={busy}
          onClick={() => checkout("manage")}
        >
          Manage subscription
        </button>
      )}
      {busy && <p role="status">Opening secure checkout…</p>}
      {message && <p role="status">{message}</p>}
    </section>
  );
}
