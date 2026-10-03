/* Client login UI only. Private client records must never be looked up by email alone.
 * Configure Auth0 and a server that verifies access tokens and record ownership
 * before enabling any client service listing. */
(function () {
  "use strict";
  var AUTH0_DOMAIN = "YOUR_AUTH0_DOMAIN.auth0.com";
  var AUTH0_CLIENT_ID = "YOUR_AUTH0_CLIENT_ID";
  var CONFIGURED = !AUTH0_DOMAIN.includes("YOUR_AUTH0_DOMAIN") && !AUTH0_CLIENT_ID.includes("YOUR_AUTH0_CLIENT_ID");
  var SDK_URL = "https://cdn.auth0.com/js/auth0-spa-js/2.1/auth0-spa-js.production.js";
  var clientReady;
  function getClient() {
    if (!clientReady) clientReady = new Promise(function (resolve, reject) {
      if (window.createAuth0Client) { resolve(); return; }
      var script = document.createElement("script"); script.src = SDK_URL;
      script.onload = resolve; script.onerror = function () { reject(new Error("Login service unavailable")); };
      document.head.appendChild(script);
    }).then(function () {
      return window.createAuth0Client({ domain: AUTH0_DOMAIN, clientId: AUTH0_CLIENT_ID,
        useRefreshTokens: true, cacheLocation: "memory",
        authorizationParams: { redirect_uri: location.origin + "/dashboard.html" } });
    });
    return clientReady;
  }
  async function session() {
    var c = await getClient(), q = new URLSearchParams(location.search);
    if ((q.has("code") || q.has("error")) && q.has("state")) {
      try { await c.handleRedirectCallback(); } finally { history.replaceState({}, document.title, location.pathname); }
    }
    var authed = await c.isAuthenticated();
    return { client: c, authed: authed, user: authed ? await c.getUser() : null };
  }
  function renderNav(isAuthed, user) {
    var out = document.getElementById("navAuthLoggedOut"), inn = document.getElementById("navAuthLoggedIn");
    if (!out || !inn) return;
    out.hidden = !!isAuthed; inn.hidden = !isAuthed;
    var label = document.getElementById("navAuthName");
    if (label && isAuthed) label.textContent = user.given_name || user.name || user.email || "Client";
  }
  function initNav() {
    if (!CONFIGURED) {
      document.querySelectorAll("[data-login-btn], [data-signup-btn]").forEach(function (btn) { btn.hidden = true; });
    }
    document.querySelectorAll("[data-login-btn], [data-signup-btn]").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.preventDefault();
        try { var c = await getClient(); await c.loginWithRedirect(btn.hasAttribute("data-signup-btn") ? { authorizationParams: { screen_hint: "signup" } } : undefined); }
        catch (err) { alert("Couldn't reach the login service. Please try again."); }
      });
    });
    document.querySelectorAll("[data-logout-btn]").forEach(function (btn) {
      btn.addEventListener("click", async function (e) {
        e.preventDefault();
        try { var c = await getClient(); c.logout({ logoutParams: { returnTo: location.origin + "/index.html" } }); }
        catch (err) { location.href = "index.html"; }
      });
    });
    if (CONFIGURED) session().then(function (s) { renderNav(s.authed, s.user); }).catch(function () { renderNav(false); });
    else {
      renderNav(false);
      var loggedOut = document.getElementById("navAuthLoggedOut");
      if (loggedOut) loggedOut.hidden = true;
    }
  }
  async function initDashboard() {
    var out = document.getElementById("dashLoggedOut"), inn = document.getElementById("dashLoggedIn");
    var loading = document.getElementById("dashLoading"), setup = document.getElementById("dashNotConfigured");
    if (!out || !inn) return;
    if (!CONFIGURED) { if (loading) loading.hidden = true; if (setup) setup.hidden = false; return; }
    try {
      var s = await session();
      if (loading) loading.hidden = true;
      if (!s.authed) { out.hidden = false; return; }
      inn.hidden = false;
      var name = document.getElementById("dashUserName"), email = document.getElementById("dashUserEmail");
      if (name) name.textContent = s.user.name || s.user.email || "there";
      if (email) email.textContent = s.user.email || "";
      var banner = document.getElementById("dashVerifyBanner");
      if (banner) banner.hidden = !!s.user.email_verified;
      var servicesError = document.getElementById("dashServicesError");
      if (servicesError) {
        servicesError.textContent = "Service records are currently unavailable. Please contact us for project status.";
        servicesError.hidden = false;
      }
      // Never send a client email to an unauthenticated lookup endpoint.
    } catch (err) {
      if (loading) loading.hidden = true;
      out.hidden = false;
    }
  }
  document.addEventListener("DOMContentLoaded", function () { initNav(); initDashboard(); });
})();
