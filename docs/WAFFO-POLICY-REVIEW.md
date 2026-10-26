# Waffo policy update — publication handoff

Sources checked on 2026-10-26:
- https://docs.waffo.ai/zh/mor/account-reviews/tos
- https://docs.waffo.ai/zh/mor/account-reviews/privacy-policy

Prepared English drafts: work/terms-draft.html and work/privacy-draft.html.

Operator confirmed by user: 支浩松, individual operator in Jiangxi Province, China. Support, billing, refund and privacy email confirmed: zhihaosong168@gmail.com. No company address invented.

Policy choices drafted for this product: $1.90 one-file purchase without expiry/top-up; $9.90 monthly unlimited subscription; cancellation in customer portal; unconditional 7-day first-subscription refund and 7-day unused single-download refund; statutory rights reserved. Proposed operational retention: payment records up to 7 years, closed support correspondence up to 2 years, privacy requests within 30 days. Provider log/backup retention is explicitly provider-managed, not falsely stated as a verified fixed interval.

Do not mark Waffo review complete merely because these pages are published. Before live checkout: set matching Terms/Privacy URLs and the refund text in Pancake store settings, verify online portal cancellation, verify billing descriptor, and verify actual production payment/refund/access lifecycle. Ensure manual retention/deletion procedures implement the published periods and verify provider retention settings. Do not assert PCI certification, security audits, signed contracts, employee policies or automated reminders that have not been verified.

Release scope: public/terms.html, public/privacy.html, public/google-analytics.js and tests/privacy.test.mjs, plus this review note if desired. Billing integration changes already in the checkout are unrelated to this scoped release and should remain uncommitted. Commit only scoped files; GitHub main triggers Vercel. Preserve appimage.png and all existing pending work. Verify production page content after deployment status succeeds.

The updated analytics script defaults to no Google request before opt-in, offers equal Essential only / Allow analytics buttons, permits changing preference, disables future GA collection on withdrawal and removes accessible first-party GA cookies. No ad personalization/signals. Tests cover initial refusal, persisted refusal, opt-in, private URL stripping, and local-host exclusion.
