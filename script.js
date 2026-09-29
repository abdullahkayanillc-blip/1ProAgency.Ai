/* Shared site behavior. No browser-only fallback is treated as delivery. */
(function () {
  "use strict";
  var WEBHOOK_URL = "https://proagancy.app.n8n.cloud/webhook/proagency-intake";
  var FORMSPREE_URL = "https://formspree.io/f/mjyvabvo";
  document.querySelectorAll("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
  var here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a[data-page]").forEach(function (a) {
    if (a.getAttribute("data-page") === here) a.setAttribute("aria-current", "page");
  });
  var navToggle = document.querySelector(".nav-toggle"), navLinks = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", navLinks.classList.contains("open") ? "true" : "false");
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { navLinks.classList.remove("open"); navToggle.setAttribute("aria-expanded", "false"); });
    });
  }
  function postToWebhook(payload) {
    return fetch(WEBHOOK_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) })
      .then(function (res) { if (!res.ok) throw new Error("Webhook failed"); return res; });
  }
  function postToReliableForm(payload) {
    var body = new URLSearchParams();
    Object.keys(payload).forEach(function (key) { if (payload[key] != null) body.append(key, String(payload[key])); });
    return fetch(FORMSPREE_URL, { method: "POST", headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" }, body: body.toString() })
      .then(function (res) { if (!res.ok) throw new Error("Form endpoint failed"); return res; });
  }
  function deliveryError() { return "Could not send your message. Please try again or use the Contact page."; }
  var intakeForm = document.querySelector("#intakeForm");
  if (intakeForm) {
    var params = new URLSearchParams(location.search);
    var serviceField = intakeForm.querySelector('[name="service"]'), msgField = intakeForm.querySelector('[name="message"]');
    if (serviceField && params.get("service")) {
      var wanted = params.get("service");
      Array.prototype.forEach.call(serviceField.options, function (opt) { if (opt.value === wanted || opt.textContent.trim() === wanted) opt.selected = true; });
    }
    if (msgField && params.get("bundle")) msgField.value = "I'm interested in the " + params.get("bundle") + " bundle. ";
    intakeForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var status = intakeForm.querySelector(".form-status");
      var data = Object.fromEntries(new FormData(intakeForm).entries());
      data.source = "website_contact"; data.submitted_at = new Date().toISOString();
      status.textContent = "Sending your project brief…"; status.className = "form-status pending";
      postToWebhook(data).catch(function () { return postToReliableForm(data); }).then(function () {
        status.textContent = "Thanks — your request has been received."; status.className = "form-status ok"; intakeForm.reset();
      }).catch(function () { status.textContent = deliveryError(); status.className = "form-status err"; });
    });
  }
  var newsForm = document.querySelector("#newsletterForm");
  if (newsForm) newsForm.addEventListener("submit", function (e) {
    e.preventDefault();
    var status = newsForm.querySelector(".form-status");
    var data = Object.fromEntries(new FormData(newsForm).entries());
    data.source = "newsletter_signup"; data.submitted_at = new Date().toISOString();
    status.textContent = "Adding you to the list…"; status.className = "form-status pending";
    postToWebhook(data).then(function () {
      status.textContent = "You're on the list."; status.className = "form-status ok"; newsForm.reset();
    }).catch(function () { status.textContent = deliveryError(); status.className = "form-status err"; });
  });
  var launcher = document.querySelector(".chat-launcher"), panel = document.querySelector(".chat-panel");
  var closeBtn = document.querySelector(".chat-close"), messages = document.querySelector(".chat-messages");
  var quickWrap = document.querySelector(".chat-quick"), chatInput = document.querySelector(".chat-input-row input");
  var chatSend = document.querySelector(".chat-input-row button");
  var CANNED = {
    "Tell me about your services": "We offer AI automation, n8n workflows, CRM integrations and business systems. See the Services page for details.",
    "Which bundle is best for me?": "Compare the available options on the Bundles page, or send us a project brief for a recommendation.",
    "How does your automation work?": "Our proposed pipeline is Capture → Normalize → Decide → Act → Verify → Report. See the Process page for details.",
    "I want to start a project": "Please use the Contact page project brief to tell us your requirements."
  };
  function addMessage(text, who) {
    if (!messages) return;
    var div = document.createElement("div"); div.className = "msg " + who; div.textContent = text;
    messages.appendChild(div); messages.scrollTop = messages.scrollHeight;
  }
  if (launcher && panel) launcher.addEventListener("click", function () {
    panel.classList.toggle("open"); if (panel.classList.contains("open") && chatInput) chatInput.focus();
  });
  if (closeBtn && panel) closeBtn.addEventListener("click", function () { panel.classList.remove("open"); });
  if (quickWrap) quickWrap.querySelectorAll("button").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var q = btn.textContent.trim(); addMessage(q, "user");
      window.setTimeout(function () { addMessage(CANNED[q] || "Please see the Services and Process pages for details.", "bot"); }, 350);
    });
  });
  function sendChatMessage() {
    if (!chatInput || !chatInput.value.trim()) return;
    var text = chatInput.value.trim(); addMessage(text, "user"); chatInput.value = "";
    postToWebhook({ source: "chat_widget", message: text, submitted_at: new Date().toISOString() })
      .then(function () { addMessage("Your message was sent. For a full proposal, use the Contact page project brief.", "bot"); })
      .catch(function () { addMessage("Your message was not delivered. Please use the Contact page to try again.", "bot"); });
  }
  if (chatSend) chatSend.addEventListener("click", sendChatMessage);
  if (chatInput) chatInput.addEventListener("keydown", function (e) { if (e.key === "Enter") sendChatMessage(); });
})();
