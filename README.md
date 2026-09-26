# 1PROAGENCY.AI — Full Website (A→Z)

A complete, static multi-page site for 1PROAGENCY.AI. No build step, no framework —
plain HTML/CSS/JS, ready to push straight to GitHub and connect to Cloudflare Pages
(or Netlify) exactly as planned: **GitHub → Cloudflare Pages → live URL → n8n webhook → CRM.**

## Pages

| File              | Page                                                              |
|--------------------|--------------------------------------------------------------------|
| `index.html`       | Home — hero, stats, core services, bundle preview, systems panel  |
| `services.html`    | Full 10-service capability index                                  |
| `bundles.html`     | All 6 pricing bundles + FAQ                                       |
| `portfolio.html`   | Representative project types (see note below)                     |
| `process.html`     | The 6-stage automation pipeline + delivery timeline                |
| `about.html`       | About Abdullah Kayani / 1PROAGENCY.AI                              |
| `resources.html`   | Short educational guides + newsletter signup                       |
| `contact.html`     | Project intake form → n8n webhook                                  |
| `profile.html`     | Full capability-profile graphic, full size                         |
| `dashboard.html`   | Client Dashboard — login-gated, shows services + status           |
| `styles.css`       | Shared design system (dark theme only)                            |
| `script.js`        | Nav, chat widget, form submissions                                 |
| `auth.js`          | Auth0 login / signup / logout + dashboard data fetch (see below)   |
| `assets/`          | Logo + service icons cropped from your graphics, plus both photos |

## Deploy — GitHub → Cloudflare Pages

1. Push every file in this folder to the root of your `1ProAgency` GitHub repo (keep the flat structure — `index.html` must stay at the top level).
2. **Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git → GitHub → select the repo.**
3. Build settings: Framework preset **None**, Build command **blank**, Build output directory **/**.
4. **Save and Deploy.** You'll get a free `*.pages.dev` URL. Every future push to `main` redeploys automatically.
5. Optional: **Workers & Pages → your project → Custom domains** to attach your own domain later.

## Activate Client Login (new)

The site now has real signup / login / logout and a **Client Dashboard**
(`dashboard.html`) that shows each client their submitted services and status.
The code is fully built and wired in — it needs two free setup steps before it
goes live, since only you can create these accounts:

### 1. Auth0 (signup / login / logout)

1. Create a free account at **auth0.com** → create a tenant.
2. **Applications → Create Application → name it → Single Page Web Applications.**
3. In that application's **Settings**, set:
   - **Allowed Callback URLs**: `https://YOUR-SITE.pages.dev/dashboard.html, http://localhost:8000/dashboard.html`
   - **Allowed Logout URLs**: `https://YOUR-SITE.pages.dev/index.html, http://localhost:8000/index.html`
   - **Allowed Web Origins**: `https://YOUR-SITE.pages.dev, http://localhost:8000`
4. Scroll to **Advanced Settings → Grant Types** and check **Refresh Token** (this
   is what keeps a client logged in as they move between pages on this
   multi-page site — save after checking it).
5. Copy the **Domain** and **Client ID** from the top of the Settings page.
6. Open `auth.js`, and near the top replace:
   ```js
   var AUTH0_DOMAIN = "YOUR_AUTH0_DOMAIN.auth0.com";
   var AUTH0_CLIENT_ID = "YOUR_AUTH0_CLIENT_ID";
   ```
   with your real values. That's it — Log In, Sign Up and Log Out all work as
   soon as these two lines are filled in and the file is redeployed.

Until this is done, clicking Log In / Sign Up shows a plain "not connected yet"
message instead of breaking — the buttons and dashboard layout work either way.

### 2. n8n: client portal lookup workflow

The dashboard asks one new webhook for "what has this client bought and what's
the status", separately from the existing intake webhook (which only *creates*
leads, it doesn't *return* them). Create a new n8n workflow:

- **Trigger**: Webhook, POST, path `client-portal-lookup` — full URL becomes
  `https://proagancy.app.n8n.cloud/webhook/client-portal-lookup` (already
  referenced in `auth.js` — rename it there too if you pick a different path).
- **Input**: `{ "email": "client@example.com" }`
- **Logic**: filter your Master CRM Data Table for rows where `contact` /
  `email` matches the given email.
- **Respond to Webhook** with a JSON array, one object per matching row:
  ```json
  [
    {
      "service": "AI Automation & n8n",
      "status": "AI_ANALYZED",
      "submitted_at": "2026-09-20",
      "requirement": "Automate lead intake from the website into our CRM",
      "budget": "$500-$1000",
      "deadline": "2 weeks"
    }
  ]
  ```
  `service`, `status` and `submitted_at` are all the dashboard needs —
  `requirement`, `budget` and `deadline` are optional but, if you send them,
  show up on the client's card too. `status` also drives the 4-step progress
  bar and the colored pill — `new`, `ai_analyzed`, `in_progress`, and
  `completed` each have their own color and step position; anything else
  falls back to a neutral style at step one.

Until this workflow exists, a logged-in client sees "couldn't load your
projects right now" instead of a broken page.

## n8n webhook

All three forms (project intake, newsletter signup, and the chat widget's free-text
box) POST JSON to:

```
https://proagancy.app.n8n.cloud/webhook/proagency-intake
```

Each payload includes a `source` field (`website_contact`, `newsletter_signup`, or
`chat_widget`) so your `01_MASTER_INTAKE` workflow can branch on it before writing to
the Master CRM. If the webhook is ever unreachable, the form falls back to saving the
submission in the visitor's browser storage and shows an honest message instead of
silently failing.

## Notes on content

- **Dark only.** The light theme and its toggle were removed by request — there is no
  `data-theme="light"` path left in the CSS or JS.
- **Real logo + real graphics.** The navbar/footer mark and the Amazon, Shopify, SEO &
  PPC Growth, Brand & Website, AI UGC & Creative, and Delivery & Automation service
  icons are cropped directly from the supplied capability-profile graphic (`assets/`),
  not recreated icons. AI Automation, AI Agents, CRM, and Email kept clean line icons —
  there wasn't a matching illustration for those four in the source image.
- **No phone/call CTA.** "Book Free Strategy Call" was removed everywhere; every
  button now routes to the project-brief form on Contact instead.
- **No public email addresses.** The footer and Contact page no longer print any
  Gmail address anywhere — not even in the code. "Client Login" is now a real
  Auth0 session (see "Activate Client Login" below) instead of a mailto fallback.
- **Bundle and portfolio cards** reuse the same real graphics where the theme
  genuinely matches (Shopify, Amazon, Growth, Creative, and the logo on the
  flagship bundle) — a couple of cards without a natural match were left clean
  rather than forcing a mismatched icon on.
- **Portfolio page** shows *representative project types*, not real client case
  studies — there weren't any supplied. Swap in real ones as they come in; the card
  structure (tag / title / description / tools used) is ready to reuse.
- **$0 cost** covers hosting and this codebase. A custom domain, paid API usage beyond
  free tiers, ad spend, and WhatsApp Business fees are billed by those providers
  directly, exactly as noted in the original planning notes.

## Local preview

No server needed — open `index.html` directly in a browser, or run a tiny local
server if you want the webhook fetches to behave exactly like production:

```bash
python3 -m http.server 8000
```
