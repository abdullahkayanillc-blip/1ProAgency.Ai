/* 1PROAGENCY.AI — shared site behaviour */
(function () {
  "use strict";

  var WEBHOOK_URL = "https://proagancy.app.n8n.cloud/webhook/proagency-intake";

  /* ---------- year ---------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  /* ---------- active nav link ---------- */
  var here = (location.pathname.split("/").pop() || "index.html");
  document.querySelectorAll(".nav-links a[data-page]").forEach(function (a) {
    if (a.getAttribute("data-page") === here) a.setAttribute("aria-current", "page");
  });

  /* ---------- mobile nav toggle ---------- */
  var navToggle = document.querySelector(".nav-toggle");
  var navLinks = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      navLinks.classList.toggle("open");
      var open = navLinks.classList.contains("open");
      navToggle.setAttribute("aria-expanded", open ? "true" : "false");
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { navLinks.classList.remove("open"); });
    });
  }

  /* Dark theme only — no toggle, no system-preference override. */

  /* Client login/signup/logout now lives in auth.js (real Auth0 session). */

  /* ---------- generic webhook post ---------- */
  function postToWebhook(payload) {
    return fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).then(function (res) {
      if (!res.ok) throw new Error("bad response");
      return res;
    });
  }

  function saveLocalFallback(key, payload) {
    try {
      var existing = JSON.parse(localStorage.getItem(key) || "[]");
      existing.push(payload);
      localStorage.setItem(key, JSON.stringify(existing));
    } catch (err) { /* ignore */ }
  }

  /* ---------- intake / contact form ---------- */
  var intakeForm = document.querySelector("#intakeForm");
  if (intakeForm) {
    var params = new URLSearchParams(location.search);
    var serviceField = intakeForm.querySelector('[name="service"]');
    var msgField = intakeForm.querySelector('[name="message"]');
    if (serviceField && params.get("service")) {
      var wanted = params.get("service");
      Array.prototype.forEach.call(serviceField.options, function (opt) {
        if (opt.value === wanted || opt.textContent.trim() === wanted) opt.selected = true;
      });
    }
    if (msgField && params.get("bundle")) {
      msgField.value = "I'm interested in the " + params.get("bundle") + " bundle. ";
    }

    intakeForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = intakeForm.querySelector(".form-status");
      var data = Object.fromEntries(new FormData(intakeForm).entries());
      data.source = "website_contact";
      data.submitted_at = new Date().toISOString();
      status.textContent = "Sending your project brief…";
      status.className = "form-status pending";
      postToWebhook(data)
        .then(function () {
          status.textContent = "Thanks — your request has been received. We reply within one business day.";
          status.className = "form-status ok";
          intakeForm.reset();
        })
        .catch(function () {
          saveLocalFallback("1pa_pending_leads", data);
          status.textContent = "Saved on this device. Our intake webhook couldn't be reached — please try again shortly.";
          status.className = "form-status err";
        });
    });
  }

  /* ---------- newsletter form ---------- */
  var newsForm = document.querySelector("#newsletterForm");
  if (newsForm) {
    newsForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = newsForm.querySelector(".form-status");
      var data = Object.fromEntries(new FormData(newsForm).entries());
      data.source = "newsletter_signup";
      data.submitted_at = new Date().toISOString();
      status.textContent = "Adding you to the list…";
      status.className = "form-status pending";
      postToWebhook(data)
        .then(function () {
          status.textContent = "You're on the list.";
          status.className = "form-status ok";
          newsForm.reset();
        })
        .catch(function () {
          saveLocalFallback("1pa_pending_leads", data);
          status.textContent = "Saved locally — webhook unreachable right now.";
          status.className = "form-status err";
        });
    });
  }

  /* ---------- chat widget ---------- */
  var launcher = document.querySelector(".chat-launcher");
  var panel = document.querySelector(".chat-panel");
  var closeBtn = document.querySelector(".chat-close");
  var messages = document.querySelector(".chat-messages");
  var quickWrap = document.querySelector(".chat-quick");
  var chatInput = document.querySelector(".chat-input-row input");
  var chatSend = document.querySelector(".chat-input-row button");

  var CANNED = {
    "Tell me about your services": "We build AI Automation & n8n systems, AI agents & chatbots, CRM & lead pipelines, Amazon (FBA/Wholesale/Private Label), Shopify stores, SEO & PPC, brand/web, and AI UGC creative. Full list is on the Services page.",
    "Which bundle is best for me?": "Starting out → Automation Foundation ($299). Chasing leads → Lead-to-Close Engine ($699). Running a store → E-commerce Growth Stack ($999). Want it all → Complete Business OS ($1999). Check the Bundles page for the full breakdown.",
    "How does your automation work?": "Every system follows the same six-stage pipeline: Capture → Normalize → Decide → Act → Verify → Report. It's on the Process page with the full technical walkthrough.",
    "I want to start a project": "Great — the fastest way is the Contact page project brief. Tell us the service, budget and timeline and we'll reply within a business day.",
  };

  function addMessage(text, who) {
    var div = document.createElement("div");
    div.className = "msg " + who;
    div.textContent = text;
    messages.appendChild(div);
    messages.scrollTop = messages.scrollHeight;
  }

  if (launcher && panel) {
    launcher.addEventListener("click", function () {
      panel.classList.toggle("open");
      if (panel.classList.contains("open") && chatInput) chatInput.focus();
    });
  }
  if (closeBtn && panel) closeBtn.addEventListener("click", function () { panel.classList.remove("open"); });

  if (quickWrap) {
    quickWrap.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var q = btn.textContent.trim();
        addMessage(q, "user");
        window.setTimeout(function () {
          addMessage(CANNED[q] || "Good question — the Services and Process pages cover that in detail.", "bot");
        }, 350);
      });
    });
  }

  function sendChatMessage() {
    if (!chatInput || !chatInput.value.trim()) return;
    var text = chatInput.value.trim();
    addMessage(text, "user");
    chatInput.value = "";
    postToWebhook({ source: "chat_widget", message: text, submitted_at: new Date().toISOString() }).catch(function () {
      saveLocalFallback("1pa_pending_leads", { source: "chat_widget", message: text });
    });
    window.setTimeout(function () {
      addMessage("Thanks — that's been logged for the team. For a full proposal, use the Contact page project brief.", "bot");
    }, 350);
  }
  if (chatSend) chatSend.addEventListener("click", sendChatMessage);
  if (chatInput) chatInput.addEventListener("keydown", function (e) { if (e.key === "Enter") sendChatMessage(); });
})();
