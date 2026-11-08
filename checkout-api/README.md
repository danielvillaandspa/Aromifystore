# AromifyStore checkout service

The GitHub Pages storefront calls this Cloudflare Worker for trusted prices, quantity coupon validation, and a reference for an order inquiry. D1 holds price overrides, private coupon definitions, expiring quotes, and temporary request counters. Checkout links to WhatsApp for manual order confirmation. Shipping, stock, payment, and final order acceptance remain manual.

The owner is the first account and manages staff accounts and quantity discount codes. Staff can edit prices and check quote references. The owner alone can see, create, or revoke coupon codes. Disabling a staff account blocks future requests with its current session. Choose a unique strong password for each staff member and send it privately. Usernames are case-insensitive, 3–48 characters, and may include ASCII letters, digits, dots, underscores or hyphens. Disabled usernames remain reserved.

Codes apply a percentage to all listed offer items after the minimum total number of units. Choose a hard-to-guess code and share it privately. Codes are reusable by anyone who receives them until revoked. Revocation blocks future quotes. A quote preserves its original terms for 24 hours, including the discount and prices. The team uses the reference to verify prices before confirming the order.

## Cloudflare setup

Use Node.js 22 or newer. Run these commands in Windows CMD from the repository root.

```cmd
cd checkout-api
copy wrangler.example.jsonc wrangler.jsonc
npx wrangler login
npx wrangler d1 create aromify-checkout
notepad wrangler.jsonc
```

Replace the placeholder `database_id` with the returned ID, and `OWNER_USERNAME` with the owner's login name. Keep `ALLOWED_ORIGINS` scoped to the storefront origins you actually serve. The example uses `https://shoparomify.store`. Add a separate preview origin only to a local development configuration.

```cmd
npx wrangler d1 migrations apply aromify-checkout --remote
npx wrangler deploy
node make-owner-verifier.mjs | npx wrangler secret put OWNER_PASSWORD_HASH
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))" | npx wrangler secret put SIGNING_KEY
```

The first secret command prompts for the owner's password with input hidden and sends only the salted verifier to Cloudflare. Choose a unique high-entropy password generated in your password manager. The second command pipes a random 32-byte signing key straight to Cloudflare. The Worker rejects login and quote requests until its secrets are set. On platforms with a restricted CPU budget, check that login works against the deployed Worker. The password verifier uses 100,000 PBKDF2-SHA256 iterations for Workers compatibility. Changing the owner's username, password verifier or signing key invalidates active sessions.

Set the deployed Worker URL in the storefront's public checkout API configuration. Set it only after confirming `GET /products` on the Worker returns the catalog. The URL is public and contains no credentials. Confirm that a test order inquiry creates a quote, that a generated test coupon respects its quantity threshold, and that the owner can verify the quote from the admin page. Revoke the test coupon when finished.

## Local checks

```cmd
node --test worker.test.mjs
```

The test uses an in-memory SQLite database with the production migration, synthetic owner credentials, and no Cloudflare or WhatsApp requests. `node:sqlite` is required. The hourly Worker trigger deletes expired quotes and temporary request counters. Quote snapshots do not contain customer names, addresses, phone numbers, or chat messages.

[Cloudflare D1 setup](https://developers.cloudflare.com/d1/get-started/) · [Worker secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
