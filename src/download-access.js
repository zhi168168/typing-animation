export async function requireDownloadSession() {
  const response = await fetch("/api/auth/get-session", {
    credentials: "same-origin",
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok && response.status !== 401)
    throw new Error(
      "Sign-in service is unavailable. Your project is kept; please try again.",
    );
  const session = await response.json();
  if (!response.ok || !session?.user?.id) {
    const error = new Error("Sign in to download your animation.");
    error.code = "SIGN_IN_REQUIRED";
    throw error;
  }
  return session;
}
