# Release checklist

## Before merging

- [ ] Review PR A (site content) and PR B (dashboard/auth) against `main`.
- [ ] Merge PR A before PR C. PR C is stacked on PR A; retarget it to `main` after PR A merges if GitHub does not update the base automatically.
- [ ] Replace `[PRIVACY EMAIL]` and `[RETENTION PERIOD]` in `contact.html` and `script.js` with approved privacy contact and retention details before production use.
- [ ] Confirm no secrets, tokens, private keys, passwords, or real customer data were added.
- [ ] Confirm dashboard record lookup remains disabled and no browser-facing CRM lookup endpoint exists.

## Local smoke checks

Start the static server from the repository root:

```sh
python3 -m http.server 8000
```

In another terminal, check the pages and shared assets:

```sh
for path in index.html about.html bundles.html contact.html dashboard.html portfolio.html services.html process.html resources.html profile.html styles.css script.js auth.js logo-mark.png hero-visual.jpg global-trust.jpg capability-profile.jpg icon-automation.png icon-shopify.png icon-amazon.png icon-creative.png icon-growth.png icon-brand-web.png icon-delivery.png; do
  printf '%-28s' "$path"
  curl -s -o /dev/null -w '%{http_code}\n' "http://127.0.0.1:8000/$path"
done
```

- [ ] Confirm all listed requests return HTTP 200.
- [ ] Check local HTML `href`/`src` paths and fragment targets.
- [ ] Run `git diff --check` and the focused dashboard/auth and contact-form checks.
- [ ] Test contact success, webhook-to-Formspree fallback, and dual-failure handling with mock requests only; do not submit real customer data.
- [ ] Verify the contact consent checkbox blocks submission when unchecked and the honeypot blocks delivery when populated.
- [ ] Verify newsletter and chat remain webhook-only and show a visible error on failure.
- [ ] Search public pages for stale documentation and placeholder copy:

```sh
rg -n -i 'TODO|lorem|README' --glob '*.html' .
```

- [ ] Review credential-keyword matches without copying any secret values into logs or reports:

```sh
rg -l -i --hidden --glob '!.git/**' --glob '!node_modules/**' 'api[_ -]?key|token|secret|password|bearer|private key' .
```

The privacy placeholders above are intentional until approved values are supplied; they must be replaced before release.

## Verify the Cloudflare Worker deployment

Do not treat a merge or GitHub Actions result as proof that the Cloudflare Worker is live.

1. In the Cloudflare dashboard, open **Workers & Pages**, select the production Worker, then open **Deployments**.
2. Confirm the Git integration targets `main` and inspect the latest deployment for a successful status and the source commit SHA.
3. After merging all PRs, run `git fetch origin main` and `git rev-parse origin/main`. Confirm the successful production deployment corresponds to that commit SHA (or to a later `main` commit containing it).
4. Check the production routes return HTTP 200:

```sh
for path in '' about bundles contact dashboard portfolio services process resources; do
  printf '== /%s ' "$path"
  curl -s -o /dev/null -w '%{http_code}\n' "https://1proagency-ai.abdullahkayanillc.workers.dev/$path"
done
```

5. Confirm the deployed content, not just its status:

```sh
test "$(curl -s 'https://1proagency-ai.abdullahkayanillc.workers.dev/bundles' | grep -ci 'Most Popular' || true)" -eq 0
test "$(curl -s 'https://1proagency-ai.abdullahkayanillc.workers.dev/about' | grep -ci 'Clients Worldwide' || true)" -eq 0
test "$(curl -s 'https://1proagency-ai.abdullahkayanillc.workers.dev/portfolio' | grep -ci 'Online' || true)" -eq 0
test "$(curl -s 'https://1proagency-ai.abdullahkayanillc.workers.dev/dashboard' | grep -ci 'README' || true)" -eq 0
```

Also inspect each live page for the unified Website Assistant greeting, matching footer, approved intake/response copy, portfolio sample labels, and the dashboard's unavailable-record message. If the page content or deployment SHA does not match the merged `main`, investigate the Worker Git integration and deployment logs before calling the release complete.

The repository's `.github/workflows/jekyll-gh-pages.yml` workflow targets GitHub Pages; it is not evidence that the Cloudflare Worker deployed.
