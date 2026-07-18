window.lazyRevealAnimations = (() => {
    let observer;
    const groups = [
        ["main > section > .container, .cta-band__inner, .site-footer .container", "lazy-reveal"],
        [".section-heading, .hero__content, .faq-layout > div:first-child, .appointment-layout > div:first-child", "lazy-reveal-left"],
        [".hero-visual, .map-card, .contact-card, .about-card .media-placeholder, .veterinarian-placeholder", "lazy-reveal-right"],
        [".card, .service-card, .grooming-card, .gallery-card, .service-category-intro article, .visit-strip article, .faq-list details, .appointment-form, .media-placeholder", "lazy-reveal-scale"]
    ];
    const reveal = element => element.classList.add("is-visible");
    const initialize = () => {
        const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!observer && "IntersectionObserver" in window && !reduceMotion) {
            observer = new IntersectionObserver(entries => entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const delay = Number(entry.target.dataset.lazyRevealDelay || 0);
                    window.setTimeout(() => reveal(entry.target), delay);
                    observer.unobserve(entry.target);
                }
            }), { threshold: 0.08, rootMargin: "0px 0px -40px" });
        }
        groups.forEach(([selector, className]) => document.querySelectorAll(selector).forEach(element => {
            element.classList.add(className);
            const parent = element.parentElement;
            if (parent?.matches(".card-grid, .gallery-grid, .faq-list, .service-category-intro, .visit-strip__grid")) {
                const index = Array.prototype.indexOf.call(parent.children, element);
                element.dataset.lazyRevealDelay = String(60 + (index % 6) * 55);
            }
            if (element.dataset.lazyRevealObserved === "true" || element.classList.contains("is-visible")) return;
            element.dataset.lazyRevealObserved = "true";
            if (reduceMotion || !observer) reveal(element); else observer.observe(element);
        }));
    };
    return { initialize };
})();

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.lazyRevealAnimations.initialize, { once: true });
} else {
    window.lazyRevealAnimations.initialize();
}
