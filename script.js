/* Shared site behavior. No browser-only fallback is treated as delivery. */
(function () {
  "use strict";
  // Primary: your n8n instance (must be Active + Authentication = None)
  var WEBHOOK_URL = "http://140.245.199.26:5678/webhook/proagency-intake";
  // Reliable fallback – delivers to abdullahkayanillc@gmail.com
  // First submission will send an activation email – click the link once.
  var FORMSUBMIT_URL = "https://formsubmit.co/ajax/abdullahkayanillc@gmail.com";

  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });

  var here = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll(".nav-links a[data-page]").forEach(function (a) {
    if (a.getAttribute("data-page") === here) a.setAttribute("aria-current", "page");
  });

  var navToggle = document.querySelector(".nav-toggle");
  var navLinks = document.querySelector(".nav-links");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", function () {
      navLinks.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", navLinks.classList.contains("open") ? "true" : "false");
    });
    navLinks.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        navLinks.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  function postToWebhook(payload) {
    return fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      mode: "cors"
    }).then(function (res) {
      if (!res.ok) throw new Error("Webhook failed: " + res.status);
      return res;
    });
  }

  function postToFormSubmit(payload) {
    var body = {
      name: payload.name || "",
      email: payload.email || "",
      country: payload.country || "",
      service: payload.service || "",
      message: payload.message || "",
      budget: payload.budget || "",
      timeline: payload.deadline || payload.timeline || "",
      source: payload.source || "website",
      submitted_at: payload.submitted_at || new Date().toISOString(),
      _subject: "New Project Brief – " + (payload.name || "Website") + " – 1PROAGENCY.AI",
      _template: "table",
      _captcha: "false"
    };
    return fetch(FORMSUBMIT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(body)
    }).then(function (res) {
      if (!res.ok) throw new Error("FormSubmit failed: " + res.status);
      return res.json();
    });
  }

  function deliveryError() {
    return "Could not send your message. Please try again or email us directly at abdullahkayanillc@gmail.com";
  }

  // ---------- Contact / Intake form ----------
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
      var submitBtn = intakeForm.querySelector('button[type="submit"]');
      var data = Object.fromEntries(new FormData(intakeForm).entries());

      // Basic validation
      if (!data.name || !data.email || !data.message) {
        status.textContent = "Please fill in Name, Email and Project details.";
        status.className = "form-status err";
        return;
      }

      data.source = "website_contact";
      data.submitted_at = new Date().toISOString();

      status.textContent = "Sending your project brief…";
      status.className = "form-status pending";
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = "Sending…";
      }

      // Try n8n first, then FormSubmit fallback
      postToWebhook(data)
        .catch(function () {
          return postToFormSubmit(data);
        })
        .then(function () {
          status.textContent = "Thanks — your request has been received. We will reply within one business day.";
          status.className = "form-status ok";
          intakeForm.reset();
        })
        .catch(function () {
          status.textContent = deliveryError();
          status.className = "form-status err";
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = "Send Project Brief →";
          }
        });
    });
  }

  // ---------- Newsletter form ----------
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
        .catch(function () {
          return postToFormSubmit(data);
        })
        .then(function () {
          status.textContent = "You're on the list. Thank you!";
          status.className = "form-status ok";
          newsForm.reset();
        })
        .catch(function () {
          status.textContent = deliveryError();
          status.className = "form-status err";
        });
    });
  }

  // ---------- Chat widget ----------
  var launcher = document.querySelector(".chat-launcher");
  var panel = document.querySelector(".chat-panel");
  var closeBtn = document.querySelector(".chat-close");
  var messages = document.querySelector(".chat-messages");
  var quickWrap = document.querySelector(".chat-quick");
  var chatInput = document.querySelector(".chat-input-row input");
  var chatSend = document.querySelector(".chat-input-row button");

  var CANNED = {
    "Tell me about your services": "We offer AI automation, n8n workflows, CRM integrations and business systems. See the Services page for details.",
    "Which bundle is best for me?": "Compare the available options on the Bundles page, or send us a project brief for a recommendation.",
    "How does your automation work?": "Our proposed pipeline is Capture → Normalize → Decide → Act → Verify → Report. See the Process page for details.",
    "I want to start a project": "Please use the Contact page project brief to tell us your requirements."
  };

  function addMessage(text, who) {
    if (!messages) return;
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
  if (closeBtn && panel) {
    closeBtn.addEventListener("click", function () {
      panel.classList.remove("open");
    });
  }

  if (quickWrap) {
    quickWrap.querySelectorAll("button").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var q = btn.textContent.trim();
        addMessage(q, "user");
        window.setTimeout(function () {
          addMessage(CANNED[q] || "Please see the Services and Process pages for details.", "bot");
        }, 350);
      });
    });
  }

  function sendChatMessage() {
    if (!chatInput || !chatInput.value.trim()) return;
    var text = chatInput.value.trim();
    addMessage(text, "user");
    chatInput.value = "";

    postToWebhook({
      source: "chat_widget",
      message: text,
      submitted_at: new Date().toISOString()
    })
      .then(function () {
        addMessage("Your message was sent. For a full proposal, use the Contact page project brief.", "bot");
      })
      .catch(function () {
        addMessage("Your message was not delivered. Please use the Contact page to try again.", "bot");
      });
  }

  if (chatSend) chatSend.addEventListener("click", sendChatMessage);
  if (chatInput) {
    chatInput.addEventListener("keydown", function (e) {
      if (e.key === "Enter") sendChatMessage();
    });
  }
})();
