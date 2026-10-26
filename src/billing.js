export async function billingAPI(path, body) {
  const response = await fetch(`/api/billing/${path}`, {
    method: body === undefined ? "GET" : "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: body === undefined ? {} : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(
      result.error || "Payment service is unavailable. Please try again.",
    );
    error.code =
      response.status === 401
        ? "SIGN_IN_REQUIRED"
        : response.status === 402
          ? "PAYMENT_REQUIRED"
          : "BILLING_ERROR";
    throw error;
  }
  return result;
}
export async function requireDownloadPayment() {
  const status = await billingAPI("status");
  if (status.credits < 1 && status.unlimitedUntil <= Date.now()) {
    const error = new Error(
      "Choose $1.90 for one download or $9.90 for one month of unlimited downloads. No automatic renewal.",
    );
    error.code = "PAYMENT_REQUIRED";
    throw error;
  }
}
