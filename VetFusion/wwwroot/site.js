window.vetFusionSite = (() => {
    let revealObserver;
    let componentReference;
    let galleryItems = [];
    let activeGalleryIndex = 0;
    let touchStartX = 0;
    let lastFocusedElement;
    const cleanup = [];

    const qs = (selector, root = document) => root.querySelector(selector);
    const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
    const on = (target, event, handler, options) => {
        target?.addEventListener(event, handler, options);
        cleanup.push(() => target?.removeEventListener(event, handler, options));
    };

    const getFocusable = root => qsa('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', root)
        .filter(element => element.offsetParent !== null || element === document.activeElement);

    const setModalState = isOpen => {
        document.body.classList.toggle("modal-open", isOpen);
    };

    const initializeHeader = () => {
        const header = qs("[data-site-header]");
        const backTop = qs("[data-back-top]");
        const sync = () => {
            header?.classList.toggle("is-compact", window.scrollY > 10);
            backTop?.classList.toggle("is-visible", window.scrollY > 420);
        };
        sync();
        on(window, "scroll", sync, { passive: true });
    };

    const initializeMenu = () => {
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

        on(button, "click", () => {
            nav.classList.contains("is-open") ? closeMenu() : openMenu();
        });

        on(document, "click", event => {
            if (!nav.classList.contains("is-open")) return;
            if (nav.contains(event.target) || button.contains(event.target)) return;
            closeMenu();
        });

        on(nav, "click", event => {
            if (event.target.closest("a")) closeMenu();
        });

        on(document, "keydown", event => {
            if (event.key === "Escape" && nav.classList.contains("is-open")) {
                closeMenu({ returnFocus: true });
            }
        });
    };

    const initializeReveals = () => {
        const targets = qsa("main > section > .container, .hero-copy, .site-footer .container");
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
            targets.forEach(target => target.classList.add("is-visible"));
            return;
        }

        revealObserver?.disconnect();
        revealObserver = new IntersectionObserver(entries => {
            entries.forEach(entry => {
                if (!entry.isIntersecting) return;
                entry.target.classList.add("is-visible");
                revealObserver.unobserve(entry.target);
            });
        }, { threshold: 0.08, rootMargin: "0px 0px -45px" });

        targets.forEach(target => {
            target.classList.add("reveal-section");
            revealObserver.observe(target);
        });
    };

    const initializeAppointmentForm = () => {
        const form = qs("#appointment-form");
        if (!form || form.dataset.initialized === "true") return;

        form.dataset.initialized = "true";
        const status = qs("#form-status");
        const button = form.querySelector('button[type="submit"]');
        const originalLabel = button?.textContent?.trim() || "Submit Request";

        on(form, "submit", async event => {
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
                const response = await fetch(form.action, {
                    method: "POST",
                    body: data,
                    headers: { Accept: "application/json" }
                });
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
    };

    const initializeEmergencyPanel = () => {
        const panel = qs("[data-emergency-panel]");
        if (!panel) return;
        const closeButton = qs("[data-emergency-close]", panel);
        const openButtons = qsa("[data-emergency-open]");

        const open = trigger => {
            lastFocusedElement = trigger;
            panel.classList.add("is-open");
            panel.setAttribute("aria-hidden", "false");
            setModalState(true);
            closeButton?.focus();
        };

        const close = ({ returnFocus } = { returnFocus: false }) => {
            panel.classList.remove("is-open");
            panel.setAttribute("aria-hidden", "true");
            setModalState(false);
            if (returnFocus) lastFocusedElement?.focus();
        };

        openButtons.forEach(button => on(button, "click", () => open(button)));
        on(closeButton, "click", () => close({ returnFocus: true }));
        on(panel, "click", event => {
            if (event.target === panel) close({ returnFocus: true });
        });
        on(document, "keydown", event => {
            if (event.key === "Escape" && panel.classList.contains("is-open")) close({ returnFocus: true });
            if (event.key !== "Tab" || !panel.classList.contains("is-open")) return;
            trapFocus(event, panel);
        });
    };

    const trapFocus = (event, root) => {
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
    };

    const initializeCopyButtons = () => {
        const status = qs("[data-copy-status]");
        qsa("[data-copy-value]").forEach(button => {
            on(button, "click", async () => {
                const value = button.getAttribute("data-copy-value") || "";
                try {
                    await navigator.clipboard.writeText(value);
                    status.textContent = "Copied.";
                } catch {
                    const input = document.createElement("textarea");
                    input.value = value;
                    document.body.append(input);
                    input.select();
                    document.execCommand("copy");
                    input.remove();
                    status.textContent = "Copied.";
                }
                window.setTimeout(() => {
                    if (status.textContent === "Copied.") status.textContent = "";
                }, 2400);
            });
        });
    };

    const initializeLightbox = () => {
        const lightbox = qs("[data-lightbox]");
        const image = qs("[data-lightbox-image]");
        const title = qs("[data-lightbox-title]");
        const caption = qs("[data-lightbox-caption]");
        const counter = qs("[data-lightbox-counter]");
        const closeButton = qs("[data-lightbox-close]");
        if (!lightbox || !image) return;

        const render = () => {
            const item = galleryItems[activeGalleryIndex];
            if (!item) return;
            image.src = item.image || item.Image;
            image.alt = item.alt || item.Alt || "";
            title.textContent = item.title || item.Title || "Gallery photo";
            caption.textContent = item.description || item.Description || "";
            counter.textContent = `${activeGalleryIndex + 1} / ${galleryItems.length}`;
        };

        const open = index => {
            activeGalleryIndex = index;
            lastFocusedElement = document.activeElement;
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
            lastFocusedElement?.focus();
        };

        const move = direction => {
            activeGalleryIndex = (activeGalleryIndex + direction + galleryItems.length) % galleryItems.length;
            render();
        };

        qsa("[data-gallery-index]").forEach(button => {
            on(button, "click", () => open(Number(button.getAttribute("data-gallery-index") || 0)));
        });
        on(qs("[data-lightbox-prev]"), "click", () => move(-1));
        on(qs("[data-lightbox-next]"), "click", () => move(1));
        on(closeButton, "click", close);
        on(lightbox, "click", event => {
            if (event.target === lightbox) close();
        });
        on(lightbox, "touchstart", event => {
            touchStartX = event.changedTouches[0].clientX;
        }, { passive: true });
        on(lightbox, "touchend", event => {
            const delta = event.changedTouches[0].clientX - touchStartX;
            if (Math.abs(delta) > 40) move(delta > 0 ? -1 : 1);
        }, { passive: true });
        on(document, "keydown", event => {
            if (!lightbox.classList.contains("is-open")) return;
            if (event.key === "Escape") close();
            if (event.key === "ArrowLeft") move(-1);
            if (event.key === "ArrowRight") move(1);
            if (event.key === "Tab") trapFocus(event, lightbox);
        });
    };

    const initializeBlazorModalHelpers = () => {
        on(document, "keydown", event => {
            const modal = qs("[data-modal]");
            if (!modal) return;
            if (event.key === "Escape") componentReference?.invokeMethodAsync("CloseActiveModal");
            if (event.key === "Tab") trapFocus(event, modal);
        });
    };

    return {
        initialize(reference, gallery) {
            componentReference = reference;
            galleryItems = Array.isArray(gallery) ? gallery : [];
            initializeHeader();
            initializeMenu();
            initializeReveals();
            initializeAppointmentForm();
            initializeEmergencyPanel();
            initializeCopyButtons();
            initializeLightbox();
            initializeBlazorModalHelpers();
        },
        dispose() {
            cleanup.splice(0).forEach(dispose => dispose());
            revealObserver?.disconnect();
            componentReference = undefined;
            setModalState(false);
            document.body.classList.remove("menu-open");
        }
    };
})();
