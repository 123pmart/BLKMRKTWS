# Store accounts: deployment and security notes

Store accounts are intentionally separate from the existing administrator login. New registrations remain `pending` until an administrator approves them, and no registration is automatically matched to an historical order or store name.

## Required production configuration

- `BLOB_READ_WRITE_TOKEN`: required on Vercel for private account and session records. Production requests fail closed if Blob storage is unavailable.
- `ADMIN_PASS`: required for administrator sign-in. There is no compiled password fallback.
- `ADMIN_USER`: optional administrator username; defaults to `pmart`.
- `ADMIN_SESSION_SECRET`: optional dedicated signing secret. When omitted, the configured admin password is used to derive the short-lived admin session signature.

`ACCOUNT_STORE_DIR` is intended only for local development or an explicitly managed self-hosted deployment. On Vercel, account data is stored under private `blackmarket/accounts/` and `blackmarket/sessions/` Blob paths. Passwords are salted scrypt hashes; session records contain only SHA-256 token hashes. Browser cookies are HttpOnly, SameSite, and Secure in production.

## Current infrastructure boundaries

- Login and registration throttling is enforced in-process. A shared limiter such as Upstash Redis is still needed for globally consistent limits across Vercel instances.
- Account record updates use Blob conditional writes. The pre-existing aggregate order file still needs a transactional database or equivalent concurrency control before order volume grows.
- The repository has no independent canonical store registry. For now, each account owns an embedded store identity. Administrators can explicitly link historical orders, but automatic name-based linking is prohibited.
- Disabling or renaming an account invalidates its existing store sessions. Store authorization is always derived from the verified server session and never from request parameters or local storage.
