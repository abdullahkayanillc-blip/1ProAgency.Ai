# 1PROAGENCY.AI website

Static multi-page HTML/CSS/JS website. The homepage describes proposed capabilities, not verified client outcomes. Portfolio examples must be clearly labeled as demonstrations unless supported by real client permission and evidence.

## Site structure

- `index.html`: homepage
- `services.html`, `bundles.html`, `portfolio.html`, `process.html`, `about.html`, `resources.html`, `contact.html`: public pages
- `dashboard.html`: client dashboard UI, currently **not connected to private service records**
- `styles.css`, `script.js`, `auth.js`: shared design, form/chat behavior and optional Auth0 login UI
- Images and icons are in the repository root; keep relative paths intact.

## Deployment

The production Worker is Git-linked to this repository's `main` branch. Verify its Cloudflare build/deployment status and the actual live page before claiming an update is published. A merge alone does not prove that a deployment succeeded. Do not purchase a plan or enable billing for this project.

For local preview, run `python3 -m http.server 8000` in the repository root, then visit `http://localhost:8000`.

## Form and chat delivery

`script.js` sends contact submissions to the configured n8n intake webhook and falls back to the configured Formspree endpoint if n8n fails. A successful HTTP response is required before the site confirms receipt. Newsletter and chat use the intake webhook only; on failure the site shows an error. Browser storage is **not** a delivery mechanism and is not used for these submissions. A successful HTTP response does not, by itself, prove that CRM, email or notification downstream actions ran; test those separately.

Before using real customer data, confirm endpoint ownership, browser CORS behavior, rate limits, consent/privacy wording and retention. Never commit credentials or live private submissions.

## Client portal — security requirement

The service-record lookup is intentionally disabled in `auth.js`. Login UI is not authorization for CRM data access. **Do not create or expose an n8n webhook that returns CRM records for an email address supplied by the browser.** Anyone can enter another person's email. Do not follow older email-only lookup instructions.

To enable private records in the future:

1. Configure an Auth0 application and API audience for the production origin; keep client ID/domain public but secrets server-side only.
2. Obtain a bearer access token from the authenticated session for that API. The backend must verify signature against Auth0 JWKS, issuer, audience, expiry and relevant claims; reject missing or invalid tokens.
3. Derive the authorized user's identity on the **server** from the verified token. For email-based record mapping, require a verified email claim and enforce record ownership server-side (or use a stable identity-to-client mapping). Do not trust browser-provided email or `user.email` as the authorization decision.
4. Apply least-privilege CRM access, minimal response fields, CORS restrictions, rate limits and audit logging. Reject unauthorized requests without returning records. Test cross-user access, expired tokens and missing verification before enabling the dashboard lookup.
5. Only then wire the frontend to the authenticated endpoint and test with separate accounts. Until then, the dashboard tells signed-in users that service records are unavailable and directs them to contact the agency.

Auth0 domain and client ID placeholders in `auth.js` are not configured. Login/sign-up cannot be considered operational until their setup and callback/web-origin configuration are tested. Do not paste private keys or passwords into browser code.

## Release checks

Verify pages and assets load; test contact success and fallback, newsletter/chat failure feedback, mobile navigation and the unavailable-service-record notice. Confirm no secrets in screenshots, repository or exported workflows. Confirm the live deployment commit before announcing publication.
