(() => {
  "use strict";

  const state = {
    content: null,
    servicesExpanded: false,
    activeGalleryIndex: 0,
    touchStartX: 0,
    lastFocusedElement: null,
    revealObserver: null
  };

  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
  const getFocusable = root => qsa('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
    .filter(element => element.offsetParent !== null || element === document.activeElement);

  const icons = {
    phone: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.1 3.5 10 7.2 8.4 9.4c1.3 2.6 3.4 4.7 6 6l2.2-1.6 3.9 2.9-.8 3.2c-.2.8-1 1.3-1.8 1.2C10.1 20 4 13.9 2.9 6.1c-.1-.8.4-1.6 1.2-1.8l3-.8Z"/></svg>',
    emergency: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7.1 3.5 10 7.2 8.4 9.4c1.3 2.6 3.4 4.7 6 6l2.2-1.6 3.9 2.9-.8 3.2c-.2.8-1 1.3-1.8 1.2C10.1 20 4 13.9 2.9 6.1c-.1-.8.4-1.6 1.2-1.8l3-.8Z"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5h16v16H4zM7 2v6M17 2v6M4 10h16"/></svg>',
    map: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.5a7 7 0 0 0-7 7c0 5.1 7 12 7 12s7-6.9 7-12a7 7 0 0 0-7-7Zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5Z"/></svg>',
    message: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4.5h16v11H9l-5 4v-15Z"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    checkup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>',
    services: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6v6h6v6h-6v6H9v-6H3V9h6V3Z"/></svg>',
    surgery: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19 19 5M14 5h5v5M5 14v5h5"/></svg>',
    vaccine: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m16 3 5 5M14 5l5 5-9 9H5v-5l9-9ZM4 20h7"/></svg>',
    grooming: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="6.5" cy="17.5" r="3"/><circle cx="17.5" cy="17.5" r="3"/><path d="m8.8 15.5 8-10.5M15.2 15.5 7.2 5"/></svg>',
    diagnostics: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v10H4zM8 20h8M12 16v4M8 11h2l1.2-3 2.2 6L15 11h1"/></svg>',
    dental: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3c2.4 0 2.8 1.2 5 1.2S14.6 3 17 3c2.5 0 4 2.2 3.3 5.5L18.5 17c-.5 2.4-2 4-3.5 4-1.2 0-1.2-4-3-4s-1.8 4-3 4c-1.5 0-3-1.6-3.5-4L3.7 8.5C3 5.2 4.5 3 7 3Z"/></svg>',
    top: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>',
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>'
  };
  const icon = name => icons[name] || icons.check;

  function setModalState(isOpen) {
    document.body.classList.toggle("modal-open", isOpen);
  }

  function trapFocus(event, root) {
    const focusable = getFocusable(root);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function initializeHeader() {
    const header = qs("[data-site-header]");
    const backTop = qs("[data-back-top]");
    const sync = () => {
      header?.classList.toggle("is-compact", window.scrollY > 10);
      backTop?.classList.toggle("is-visible", window.scrollY > 420);
    };
    sync();
    window.addEventListener("scroll", sync, { passive: true });
  }

  function initializeMenu() {
    const button = qs("[data-menu-toggle]");
    const nav = qs("[data-primary-nav]");
    if (!button || !nav) return;

    const closeMenu = ({ returnFocus } = { returnFocus: false }) => {
      nav.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      document.body.classList.remove("menu-open");
      if (returnFocus) button.focus();
    };
    const openMenu = () => {
      nav.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      document.body.classList.add("menu-open");
      getFocusable(nav)[0]?.focus();
    };

    button.addEventListener("click", () => nav.classList.contains("is-open") ? closeMenu() : openMenu());
    document.addEventListener("click", event => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || button.contains(event.target)) return;
      closeMenu();
    });
    nav.addEventListener("click", event => { if (event.target.closest("a")) closeMenu(); });
    document.addEventListener("keydown", event => { if (event.key === "Escape" && nav.classList.contains("is-open")) closeMenu({ returnFocus: true }); });
  }

  function initializeReveals() {
    const targets = qsa("main > section > .container, .hero-copy, .site-footer .container");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      targets.forEach(target => target.classList.add("is-visible"));
      return;
    }
    state.revealObserver?.disconnect();
    state.revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        state.revealObserver.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -45px" });
    targets.forEach(target => {
      target.classList.add("reveal-section");
      state.revealObserver.observe(target);
    });
  }

  function serviceCard(service, index) {
    const emergency = service.category === "Emergency" ? " service-card--emergency" : "";
    return `<button class="service-card${emergency}" type="button" data-service-index="${index}"><span class="icon-badge" aria-hidden="true">${icon(service.icon)}</span><h3>${escapeHtml(service.title)}</h3><p>${escapeHtml(service.description)}</p><span class="card-arrow" aria-hidden="true">${icon("next")}</span></button>`;
  }

  function renderServices() {
    const grid = qs("#services-list");
    const toggle = qs('.section-toggle[aria-controls="services-list"]');
    const services = state.content?.services || [];
    if (!grid || !services.length) return;
    const items = state.servicesExpanded ? services : services.slice(0, 4);
    grid.innerHTML = items.map(serviceCard).join("");
    qsa("[data-service-index]", grid).forEach(button => button.addEventListener("click", () => openServiceModal(services[Number(button.dataset.serviceIndex || 0)])));
    if (toggle) {
      toggle.hidden = services.length <= 4;
      toggle.setAttribute("aria-expanded", String(state.servicesExpanded));
      toggle.innerHTML = `${icon(state.servicesExpanded ? "top" : "next")}<span>${state.servicesExpanded ? "Show Less" : "Show More"}</span>`;
      if (!toggle.dataset.staticReady) {
        toggle.dataset.staticReady = "true";
        toggle.addEventListener("click", () => {
          const wasExpanded = state.servicesExpanded;
          state.servicesExpanded = !state.servicesExpanded;
          renderServices();
          if (wasExpanded) qs("#services")?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }
    }
  }

  function buildModal(html) {
    const modal = document.createElement("div");
    modal.className = "modal-backdrop";
    modal.setAttribute("data-modal", "");
    modal.innerHTML = html;
    document.body.append(modal);
    setModalState(true);
    state.lastFocusedElement = document.activeElement;
    qs('button[aria-label^="Close"]', modal)?.focus();
    modal.addEventListener("click", event => { if (event.target === modal) closeModal(modal); });
    return modal;
  }

  function closeModal(modal = qs("[data-modal]")) {
    modal?.remove();
    setModalState(false);
    state.lastFocusedElement?.focus();
  }

  function openServiceModal(service) {
    if (!service) return;
    const modal = buildModal(`<section class="content-modal content-modal--service" role="dialog" aria-modal="true" aria-labelledby="service-modal-title"><header><div><span class="modal-kicker">${escapeHtml(service.category)}</span><h2 id="service-modal-title">${escapeHtml(service.title)}</h2></div><button type="button" aria-label="Close service details">&times;</button></header><div class="service-modal__body"><div class="service-modal__icon" aria-hidden="true">${icon(service.icon)}</div><div class="service-modal__copy"><p>${escapeHtml(service.description)}</p><p class="service-modal__hint">For appointment requests, send your preferred schedule and pet concern. For urgent concerns, call the clinic directly.</p></div></div><footer><a class="button" href="#appointment">${icon("calendar")}<span>Request Appointment</span></a><a class="button button--secondary" href="${escapeHtml(state.content.clinic.phoneLink)}">${icon("phone")}<span>Call Us</span></a></footer></section>`);
    qs("header button", modal)?.addEventListener("click", () => closeModal(modal));
    qs('a[href="#appointment"]', modal)?.addEventListener("click", () => closeModal(modal));
  }

  function openAnnouncementModal(announcement) {
    if (!announcement) return;
    const urgent = String(announcement.category).toLowerCase() === "emergency";
    const effective = announcement.effectiveDate ? `<div><dt>Effective</dt><dd>${escapeHtml(announcement.effectiveDate)}</dd></div>` : "";
    const note = urgent ? `<p class="modal-note modal-note--urgent">For urgent concerns, call ${escapeHtml(state.content.clinic.phone)} directly.</p>` : "";
    const modal = buildModal(`<section class="content-modal content-modal--announcement" role="dialog" aria-modal="true" aria-labelledby="announcement-modal-title"><header><div><span class="modal-kicker ${urgent ? "modal-kicker--emergency" : ""}">${escapeHtml(announcement.category)}</span><h2 id="announcement-modal-title">${escapeHtml(announcement.title)}</h2><small>${escapeHtml(announcement.publishDate)}</small></div><button type="button" aria-label="Close announcement details">&times;</button></header><div class="content-modal__body"><img src="${escapeHtml(announcement.imagePath)}" alt="${escapeHtml(announcement.imageAlt)}" width="900" height="506" loading="lazy"><div><span class="category-badge">${escapeHtml(announcement.category)}</span><dl class="date-list"><div><dt>Published</dt><dd>${escapeHtml(announcement.publishDate)}</dd></div>${effective}</dl><p>${escapeHtml(announcement.fullDescription)}</p>${note}</div></div><footer><a class="button button--secondary" href="${escapeHtml(announcement.actionUrl)}">${icon("next")}<span>${escapeHtml(announcement.actionText)}</span></a></footer></section>`);
    qs("header button", modal)?.addEventListener("click", () => closeModal(modal));
    qs("footer a", modal)?.addEventListener("click", () => closeModal(modal));
  }

  function initializeAnnouncementModals() {
    const announcements = state.content.announcements || [];
    const pinned = announcements.find(item => item.isPinned);
    qs(".featured-announcement")?.addEventListener("click", () => openAnnouncementModal(pinned));
    qsa(".announcement-card").forEach(card => card.addEventListener("click", () => {
      const title = qs("h3", card)?.textContent?.trim();
      openAnnouncementModal(announcements.find(item => item.title === title));
    }));
  }

  function initializeAppointmentForm() {
    const form = qs("#appointment-form");
    if (!form) return;
    const status = qs("#form-status");
    const button = form.querySelector('button[type="submit"]');
    const originalLabel = button?.textContent?.trim() || "Submit Request";
    form.addEventListener("submit", async event => {
      event.preventDefault();
      status.className = "form-status full";
      status.textContent = "";
      if (!form.reportValidity()) {
        status.className = "form-status full error";
        status.textContent = "Please complete the required fields before submitting.";
        return;
      }
      const data = new FormData(form);
      if (String(data.get("honeypot") || "").trim()) return;
      button.disabled = true;
      button.textContent = "Sending...";
      try {
        const response = await fetch(form.action, { method: "POST", body: data, headers: { Accept: "application/json" } });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || result.success === false) throw new Error("Submission failed");
        status.className = "form-status full success";
        status.textContent = "Your appointment request has been received. The clinic will contact you to confirm the final schedule.";
        form.reset();
      } catch {
        status.className = "form-status full error";
        status.textContent = "Your request could not be sent. Please try again or call 0966 085 1536.";
      } finally {
        button.disabled = false;
        button.textContent = originalLabel;
      }
    });
  }

  function initializeEmergencyPanel() {
    const panel = qs("[data-emergency-panel]");
    if (!panel) return;
    const closeButton = qs("[data-emergency-close]", panel);
    const open = trigger => {
      state.lastFocusedElement = trigger;
      panel.classList.add("is-open");
      panel.setAttribute("aria-hidden", "false");
      setModalState(true);
      closeButton?.focus();
    };
    const close = ({ returnFocus } = { returnFocus: false }) => {
      panel.classList.remove("is-open");
      panel.setAttribute("aria-hidden", "true");
      setModalState(false);
      if (returnFocus) state.lastFocusedElement?.focus();
    };
    qsa("[data-emergency-open]").forEach(button => button.addEventListener("click", () => open(button)));
    closeButton?.addEventListener("click", () => close({ returnFocus: true }));
    panel.addEventListener("click", event => { if (event.target === panel) close({ returnFocus: true }); });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && panel.classList.contains("is-open")) close({ returnFocus: true });
      if (event.key === "Tab" && panel.classList.contains("is-open")) trapFocus(event, panel);
    });
  }

  function initializeCopyButtons() {
    const status = qs("[data-copy-status]");
    qsa("[data-copy-value]").forEach(button => button.addEventListener("click", async () => {
      const value = button.getAttribute("data-copy-value") || "";
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const input = document.createElement("textarea");
        input.value = value;
        document.body.append(input);
        input.select();
        document.execCommand("copy");
        input.remove();
      }
      status.textContent = "Copied.";
      window.setTimeout(() => { if (status.textContent === "Copied.") status.textContent = ""; }, 2400);
    }));
  }

  function initializeLightbox() {
    const lightbox = qs("[data-lightbox]");
    const image = qs("[data-lightbox-image]");
    const title = qs("[data-lightbox-title]");
    const caption = qs("[data-lightbox-caption]");
    const counter = qs("[data-lightbox-counter]");
    const closeButton = qs("[data-lightbox-close]");
    const galleryItems = state.content.galleryItems || [];
    if (!lightbox || !image || !galleryItems.length) return;
    const render = () => {
      const item = galleryItems[state.activeGalleryIndex];
      image.src = item.image;
      image.alt = item.alt || "";
      title.textContent = item.title || "Gallery photo";
      caption.textContent = item.description || "";
      counter.textContent = `${state.activeGalleryIndex + 1} / ${galleryItems.length}`;
    };
    const open = index => {
      state.activeGalleryIndex = index;
      state.lastFocusedElement = document.activeElement;
      render();
      lightbox.classList.add("is-open");
      lightbox.setAttribute("aria-hidden", "false");
      setModalState(true);
      closeButton?.focus();
    };
    const close = () => {
      lightbox.classList.remove("is-open");
      lightbox.setAttribute("aria-hidden", "true");
      setModalState(false);
      state.lastFocusedElement?.focus();
    };
    const move = direction => {
      state.activeGalleryIndex = (state.activeGalleryIndex + direction + galleryItems.length) % galleryItems.length;
      render();
    };
    qsa("[data-gallery-index]").forEach((button, index) => button.addEventListener("click", () => open(index)));
    qs("[data-lightbox-prev]")?.addEventListener("click", () => move(-1));
    qs("[data-lightbox-next]")?.addEventListener("click", () => move(1));
    closeButton?.addEventListener("click", close);
    lightbox.addEventListener("click", event => { if (event.target === lightbox) close(); });
    lightbox.addEventListener("touchstart", event => { state.touchStartX = event.changedTouches[0].clientX; }, { passive: true });
    lightbox.addEventListener("touchend", event => {
      const delta = event.changedTouches[0].clientX - state.touchStartX;
      if (Math.abs(delta) > 40) move(delta > 0 ? -1 : 1);
    }, { passive: true });
    document.addEventListener("keydown", event => {
      const modal = qs("[data-modal]");
      if (modal && event.key === "Escape") closeModal(modal);
      if (modal && event.key === "Tab") trapFocus(event, modal);
      if (!lightbox.classList.contains("is-open")) return;
      if (event.key === "Escape") close();
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
      if (event.key === "Tab") trapFocus(event, lightbox);
    });
  }

  async function initialize() {
    initializeHeader();
    initializeMenu();
    initializeReveals();
    initializeAppointmentForm();
    initializeEmergencyPanel();
    initializeCopyButtons();
    const response = await fetch("config/vetfusion-content.json");
    state.content = await response.json();
    renderServices();
    initializeAnnouncementModals();
    initializeLightbox();
  }

  document.addEventListener("DOMContentLoaded", () => {
    initialize().catch(error => console.error("VetFusion static initialization failed", error));
  });
})();
