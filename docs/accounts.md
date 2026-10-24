# Typing Animation accounts

Adapt the inspected Compresser PDF flow to Typing Animation: English email registration with confirmation, sign-in, verification resend, password reset, Google OAuth when configured, persistent sessions, profile/name editing, password change, sign-out and email-confirmed deletion. Accounts remain optional for animation creation and exports. Editing state stays in existing browser storage through account redirects.

## Interface direction

Use the existing Inter/neutral/white-action design system. Add Sign in to the homepage navigation and the editor toolbar. /account is a dedicated page with a home link, an uncluttered form, explicit pending/error/success feedback, password visibility controls and links between sign-in, sign-up and recovery. On mobile it uses full-width fields with no horizontal overflow. A signed-in account page shows identity, profile, password and deletion actions. The header reflects the actual session, never a simulated login.

## Environments

Local development uses Better Auth with a persistent SQLite database under ignored work/accounts, and an explicitly enabled loopback-only test mailbox. Test email links are captured locally; they are never sent to real inboxes. Production uses an independent PostgreSQL database, secret, SMTP sender and optional Google credentials. Do not copy PDF project secrets or user records. Unconfigured providers are unavailable rather than claiming a successful operation.

## Local preview

The ignored `.env.local` enables `AUTH_DEV_MODE=true` with `ACCOUNT_ORIGIN=http://127.0.0.1:3000`. Use that exact origin in the browser. The account database, independent random signing secret and test mailbox persist in `work/accounts/`; never publish or commit this directory. An explicit production origin cannot enable this local mode. This is a real Better Auth/SQLite implementation, not localStorage authentication.

Open `/account` to register. Follow the local test inbox link, refresh, and open the verification email. After confirming the address, sign in to return to the editor. The same inbox supports password reset and account deletion. No real email is sent in local mode, and no account credentials from Compresser PDF have been reused.

## Public configuration

Use Node.js 24. Vercel deployment now has a dedicated account Function; follow [DEPLOYMENT.md](DEPLOYMENT.md). The Windows Node server remains available for local use. Set server-side variables from `.env.example`:

- `ACCOUNT_ORIGIN=https://typing-animation.com`, independently from the SEO `SITE_URL`.
- A new `DATABASE_URL` for this product, with PostgreSQL TLS enabled.
- An independent `BETTER_AUTH_SECRET` of at least 32 random characters.
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM` and, if needed, both `SMTP_USER` and `SMTP_PASS`. Authorize the sender with your email provider.
- Both `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` to enable Google. Register `https://typing-animation.com/api/auth/callback/google` as an authorized redirect URI.

Leave `AUTH_DEV_MODE` unset/false and do not copy `.env.local` to a public deployment. Public migrations are explicit; follow the deployment guide to migrate the new database. Static-only hosting does not provide these account APIs. On Vercel, the included account Function provides authentication and the browser encoder provides MP4/WebM; no persistent video backend is needed there.

The server enables only configured providers. Account passwords are hashed by Better Auth; session cookies are HTTP-only and secure on HTTPS. Sessions expire after seven days. Verification is required for email/password sign-in, reset tokens expire and are single-use, and password reset revokes existing sessions. Deletion requires typed confirmation in the UI, an active session and an emailed token that expires after one hour. It removes the user and linked account/session records while keeping the local animation project. No export login gate has been added.

## Validation and limits

Automated tests exercise the real persistent SQLite adapter: registration, blocked unverified sign-in, email verification, profile update, password change, reset/token reuse rejection, session revocation, database reopen, sign-out, email-confirmed deletion, cross-origin rejection, body limits and unsafe callback rejection. Existing animation/SEO tests remain in place.

Built-in browser QA completed the full register → verify → sign in → return to editor → sign out → forgot/reset password → sign in with new password → request deletion → confirm email → signed-out flow using a disposable local test identity. The original animation text survived sign-in and deletion. No real email, Google authorization, production database or public deployment has been tested because Typing Animation's external credentials have not been supplied.

Final checks: production build and all 18 tests pass. Desktop screenshots at native 1280px and mobile at 390x844 were inspected with view_image. Typography, neutral palette, field/button scale, navigation, status feedback and mobile gutters match the existing design system. Form switches return to the top, passwords can be shown/hidden, and there is no horizontal overflow in the mobile account page, homepage header or editor header. Final screenshots: docs/design/account-signin.jpg, account-register.jpg and account-mobile.png. The temporary QA account was deleted through the actual confirmation flow; its local test messages were removed. No public account service has been enabled.
