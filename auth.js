/* 1PROAGENCY.AI — client authentication (Auth0)
 * ------------------------------------------------------------------
 * REQUIRED SETUP before this goes live — see README.md "Activate Client Login":
 *   1. Create a free Auth0 account + a "Single Page Application".
 *   2. Paste your Domain and Client ID below.
 *   3. In that Auth0 application's settings, set Allowed Callback URLs,
 *      Allowed Logout URLs and Allowed Web Origins to your real site URL
 *      (e.g. https://1proagency.pages.dev, plus http://localhost:8000 while testing).
 *   4. Under Advanced Settings → Grant Types, enable "Refresh Token" so
 *      sessions survive normal page-to-page navigation on this multi-page site.
 * Until these are set, Log In / Sign Up will show a friendly "not configured
 * yet" message instead of failing silently.
 * ------------------------------------------------------------------ */
(function () {
  "use strict";

  var AUTH0_DOMAIN = "YOUR_AUTH0_DOMAIN.auth0.com";
  var AUTH0_CLIENT_ID = "YOUR_AUTH0_CLIENT_ID";
  var CONFIGURED = AUTH0_DOMAIN.indexOf("YOUR_AUTH0_DOMAIN") === -1 && AUTH0_CLIENT_ID.indexOf("YOUR_AUTH0_CLIENT_ID") === -1;

  // Every client's service/order lookup — see README "n8n: client portal lookup workflow".
  var CLIENT_LOOKUP_WEBHOOK = "https://proagancy.app.n8n.cloud/webhook/client-portal-lookup";

  var SDK_URL = "https://cdn.auth0.com/js/auth0-spa-js/2.1/auth0-spa-js.production.js";
  var client = null;
  var clientReady = null;

  function loadSdk() {
    if (window.createAuth0Client) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = SDK_URL;
      s.onload = resolve;
      s.onerror = function () { reject(new Error("Auth0 SDK failed to load")); };
      document.head.appendChild(s);
    });
  }

  function getClient() {
    if (clientReady) return clientReady;
    clientReady = loadSdk().then(function () {
      return window.createAuth0Client({
        domain: AUTH0_DOMAIN,
        clientId: AUTH0_CLIENT_ID,
        useRefreshTokens: true,
        cacheLocation: "memory",
        authorizationParams: { redirect_uri: window.location.origin + "/dashboard.html" },
      });
    }).then(function (c) {
      client = c;
      return c;
    });
    return clientReady;
  }

  function money(el) { return el; }

  async function handleRedirectIfPresent() {
    var q = new URLSearchParams(window.location.search);
    if ((q.has("code") || q.has("error")) && q.has("state")) {
      try {
        await client.handleRedirectCallback();
      } catch (e) { /* fall through to normal UI state */ }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }

  function renderNavState(isAuthed, user) {
    var out = document.getElementById("navAuthLoggedOut");
    var inn = document.getElementById("navAuthLoggedIn");
    var nameEl = document.getElementById("navAuthName");
    if (!out || !inn) return;
    if (isAuthed) {
      out.hidden = true;
      inn.hidden = false;
      if (nameEl) nameEl.textContent = (user && (user.given_name || user.name || user.email)) || "Client";
    } else {
      out.hidden = false;
      inn.hidden = true;
    }
  }

  var SDK_ERROR_MSG = "Couldn't reach the login service just now — check your connection and try again.";

  async function initNav() {
    document.querySelectorAll("[data-login-btn]").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.preventDefault();
        if (!CONFIGURED) { alert("Client login isn't connected yet — Auth0 setup is still pending. See README.md."); return; }
        try {
          var c = await getClient();
          await c.loginWithRedirect();
        } catch (err) { alert(SDK_ERROR_MSG); }
      });
    });
    document.querySelectorAll("[data-signup-btn]").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.preventDefault();
        if (!CONFIGURED) { alert("Client sign-up isn't connected yet — Auth0 setup is still pending. See README.md."); return; }
        try {
          var c = await getClient();
          await c.loginWithRedirect({ authorizationParams: { screen_hint: "signup" } });
        } catch (err) { alert(SDK_ERROR_MSG); }
      });
    });
    document.querySelectorAll("[data-logout-btn]").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.preventDefault();
        if (!CONFIGURED) { window.location.href = "index.html"; return; }
        try {
          var c = await getClient();
          c.logout({ logoutParams: { returnTo: window.location.origin + "/index.html" } });
        } catch (err) { window.location.href = "index.html"; }
      });
    });

    if (!CONFIGURED) { renderNavState(false); return; }
    try {
      var c = await getClient();
      await handleRedirectIfPresent();
      var isAuthed = await c.isAuthenticated();
      var user = isAuthed ? await c.getUser() : null;
      renderNavState(isAuthed, user);
    } catch (e) {
      renderNavState(false);
    }
  }

  /* ---------- dashboard page only ---------- */
  async function initDashboard() {
    var loggedOutView = document.getElementById("dashLoggedOut");
    var loggedInView = document.getElementById("dashLoggedIn");
    var loadingView = document.getElementById("dashLoading");
    var notConfiguredView = document.getElementById("dashNotConfigured");
    if (!loggedOutView || !loggedInView) return;

    if (!CONFIGURED) {
      if (loadingView) loadingView.hidden = true;
      if (notConfiguredView) notConfiguredView.hidden = false;
      return;
    }

    var c, isAuthed, user;
    try {
      c = await getClient();
      await handleRedirectIfPresent();
      isAuthed = await c.isAuthenticated();
      if (isAuthed) user = await c.getUser();
    } catch (e) {
      // SDK failed to load, network blocked, etc. — fail open to the logged-out view
      // rather than leaving the visitor stuck on "Checking your session…" forever.
      if (loadingView) loadingView.hidden = true;
      loggedOutView.hidden = false;
      return;
    }
    if (loadingView) loadingView.hidden = true;

    if (!isAuthed) {
      loggedOutView.hidden = false;
      return;
    }
    loggedInView.hidden = false;

    var nameTarget = document.getElementById("dashUserName");
    var emailTarget = document.getElementById("dashUserEmail");
    if (nameTarget) nameTarget.textContent = user.name || user.email || "there";
    if (emailTarget) emailTarget.textContent = user.email || "";

    await loadServices(user.email);
  }

  async function loadServices(email) {
    var list = document.getElementById("dashServicesList");
    var empty = document.getElementById("dashServicesEmpty");
    var err = document.getElementById("dashServicesError");
    var loading = document.getElementById("dashServicesLoading");
    if (!list) return;
    try {
      var res = await fetch(CLIENT_LOOKUP_WEBHOOK, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email }),
      });
      if (!res.ok) throw new Error("bad response");
      var records = await res.json();
      if (loading) loading.hidden = true;
      if (!Array.isArray(records) || records.length === 0) {
        if (empty) empty.hidden = false;
        return;
      }
      var STEPS = ["new", "ai_analyzed", "in_progress", "completed"];
      records.forEach(function (rec) {
        var li = document.createElement("li");
        li.className = "dash-service-row";
        var statusKey = (rec.status || "new").toLowerCase();
        var stepIdx = STEPS.indexOf(statusKey);
        if (stepIdx === -1) stepIdx = 0;

        var metaBits = [];
        if (rec.submitted_at) metaBits.push(escapeHtml(rec.submitted_at));
        if (rec.budget) metaBits.push("Budget: " + escapeHtml(rec.budget));
        if (rec.deadline) metaBits.push("Timeline: " + escapeHtml(rec.deadline));

        var stepperHtml = STEPS.map(function (s, i) {
          return '<span class="dash-step' + (i <= stepIdx ? " dash-step-done" : "") + '"></span>';
        }).join("");

        li.innerHTML =
          '<div class="dash-service-top">' +
            '<div><strong>' + escapeHtml(rec.service || "Service") + "</strong>" +
            (metaBits.length ? '<span class="dash-service-meta">' + metaBits.join(" · ") + "</span>" : "") +
            (rec.requirement ? '<p class="dash-service-req">' + escapeHtml(rec.requirement) + "</p>" : "") +
            "</div>" +
            '<span class="dash-status dash-status-' + escapeHtml(statusKey) + '">' + escapeHtml(rec.status || "New") + "</span>" +
          "</div>" +
          '<div class="dash-stepper" aria-hidden="true">' + stepperHtml + "</div>";
        list.appendChild(li);
      });
    } catch (e) {
      if (loading) loading.hidden = true;
      if (err) err.hidden = false;
    }
  }

  function escapeHtml(str) {
    var d = document.createElement("div");
    d.textContent = String(str == null ? "" : str);
    return d.innerHTML;
  }

  document.addEventListener("DOMContentLoaded", function () {
    initNav();
    initDashboard(); // no-ops safely on pages without dashboard elements
  });
})();
