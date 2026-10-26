import React, { useEffect, useState } from "react";
import { billingAPI } from "./billing.js";
import { requireDownloadSession } from "./download-access.js";
import "./billing.css";

export function BillingPanel({
  beforeCheckout,
  onError,
  children,
  onExport,
  format,
  disabled,
  progressContent,
}) {
  const [status, setStatus] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [plan, setPlan] = useState("single");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);
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
            setFailed(false);
            setLoading(false);
          }
        })
        .catch((error) => {
          if (active) {
            setLoading(false);
            setFailed(error.code !== "SIGN_IN_REQUIRED");
            if (error.code === "SIGN_IN_REQUIRED") {
              setStatus(null);
              setMessage("");
            }
            if (error.code !== "SIGN_IN_REQUIRED") setMessage(error.message);
          }
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
  }, [retry]);
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
  const entitled = unlimited || status?.credits > 0;
  const purchasing = !onExport || !entitled;
  const locked = busy || disabled;
  return (
    <div className={onExport ? "export-checkout" : "account-checkout"}>
      <div className={onExport ? "export-body" : undefined}>
        {children}
        <section
          className="billing-panel"
          aria-label="Download plans"
          aria-busy={loading}
        >
          {status?.mode === "test" && (
            <p role="status">Test mode — no real charges.</p>
          )}
          <div className="billing-heading">
            <strong>
              {onExport
                ? entitled
                  ? "Ready to download"
                  : "2. Choose a plan"
                : "Download plans"}
            </strong>
            <span>
              {unlimited
                ? `Unlimited until ${new Date(status.unlimitedUntil).toLocaleDateString()}`
                : status?.credits
                  ? `${status.credits} download${status.credits === 1 ? "" : "s"} available`
                  : "Edit and preview for free"}
            </span>
          </div>
          {!unlimited && purchasing && (
            <div
              className="billing-plans"
              role="group"
              aria-label="Choose a download plan"
            >
              <button
                type="button"
                disabled={locked}
                aria-pressed={plan === "single"}
                onClick={() => {
                  setPlan("single");
                  setAgreed(false);
                }}
              >
                <strong>
                  $1.90 <small>/ download</small>
                </strong>
                <span>One file · one-time payment</span>
              </button>
              <button
                type="button"
                disabled={locked || status?.hasSubscription}
                aria-pressed={plan === "monthly"}
                onClick={() => {
                  setPlan("monthly");
                  setAgreed(false);
                }}
              >
                <strong>
                  $9.90 <small>/ month</small>
                </strong>
                <span>Unlimited downloads · renews monthly</span>
              </button>
            </div>
          )}
          {!unlimited && purchasing && (
            <>
              <label className="billing-consent">
                <input
                  type="checkbox"
                  checked={agreed}
                  disabled={locked}
                  onChange={(event) => setAgreed(event.target.checked)}
                />
                <span>
                  I agree to the{" "}
                  <a href="/terms.html" target="_blank" rel="noopener">
                    Terms
                  </a>{" "}
                  and acknowledge the{" "}
                  <a href="/privacy.html" target="_blank" rel="noopener">
                    Privacy Policy
                  </a>
                  .{" "}
                  {plan === "monthly"
                    ? "I authorize $9.90 USD each month until I cancel through Manage subscription."
                    : "One file download. No recurring charge."}{" "}
                  Applicable taxes are shown at checkout.
                </span>
              </label>
              <p className="billing-policy">
                7-day refund: first subscription or unused single download.{" "}
                <a href="/terms.html#refunds" target="_blank" rel="noopener">
                  Refund policy
                </a>{" "}
                ·{" "}
                <a href="/pricing.html" target="_blank" rel="noopener">
                  Compare plans
                </a>
              </p>
            </>
          )}
          {status?.hasSubscription && (
            <button
              className="billing-manage"
              disabled={locked}
              onClick={() => checkout("manage")}
            >
              Manage subscription
            </button>
          )}
          {message && <p role="status">{message}</p>}
          {failed && (
            <button
              className="billing-manage"
              disabled={locked}
              onClick={() => {
                setLoading(true);
                setRetry((value) => value + 1);
              }}
            >
              Retry loading plans
            </button>
          )}
        </section>
      </div>
      {(!unlimited || onExport) && (
        <div className={onExport ? "export-footer" : "billing-footer"}>
          {progressContent || (
            <>
              <button
                type="button"
                className="primary-button export-cta"
                disabled={
                  locked ||
                  loading ||
                  failed ||
                  (purchasing && !unlimited && !agreed)
                }
                onClick={() =>
                  entitled && onExport ? onExport() : checkout(plan)
                }
              >
                {busy
                  ? "Opening secure checkout…"
                  : loading
                    ? "Checking download access…"
                    : entitled && onExport
                      ? `Export ${format?.toUpperCase()}`
                      : `Continue to checkout · $${plan === "monthly" ? "9.90 / month" : "1.90"}`}
              </button>
              <p className="checkout-caption">
                {entitled && onExport
                  ? unlimited
                    ? "Your subscription includes this export."
                    : "Uses 1 download credit."
                  : "Secure checkout by Waffo · Return here to export after payment"}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
