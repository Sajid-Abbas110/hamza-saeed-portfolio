(() => {
  "use strict";

  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Footer year ---------- */
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Header: scrolled state + mobile menu ---------- */
  const header = $("#siteHeader");
  const toggle = $("#menuToggle");
  const nav = $("#nav");

  if (header) {
    const onScroll = () => header.classList.toggle("is-scrolled", window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
  if (toggle && nav) {
    const setMenu = (open) => {
      document.body.classList.toggle("nav-open", open);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      document.body.style.overflow = open ? "hidden" : "";
    };
    toggle.addEventListener("click", () => setMenu(!document.body.classList.contains("nav-open")));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setMenu(false); });
    window.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
    window.matchMedia("(min-width: 1101px)").addEventListener("change", () => setMenu(false));
  }

  /* ---------- Active nav link while scrolling (same-page links only) ---------- */
  const spyLinks = $$('.nav a[href^="#"]:not(.nav-cta)');
  const sections = spyLinks.map((a) => ({ a, el: $(a.getAttribute("href")) })).filter((s) => s.el);
  if (sections.length) {
    let queued = false;
    const spy = () => {
      queued = false;
      const line = window.innerHeight * 0.4;
      let active = null;
      sections.forEach((s) => { if (s.el.getBoundingClientRect().top <= line) active = s; });
      sections.forEach((s) => s.a.classList.toggle("is-active", s === active));
    };
    window.addEventListener("scroll", () => { if (!queued) { queued = true; requestAnimationFrame(spy); } }, { passive: true });
    spy();
  }

  /* ---------- Reveal on scroll ---------- */
  const revealEls = $$(".reveal");
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealEls.forEach((el) => el.classList.add("is-in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
    revealEls.forEach((el) => {
      const sibs = el.parentElement ? [...el.parentElement.children].filter((c) => c.classList.contains("reveal")) : [];
      el.style.setProperty("--d", Math.min(sibs.indexOf(el), 5) * 90 + "ms");
      io.observe(el);
    });
  }

  /* ---------- Photo slots: try other extensions, then show a placeholder ----------
     Every <img> points at e.g. images/gallery-01.jpg. If that file is missing we try
     .jpeg .png .webp .avif; if none exist the slot shows a tidy placeholder instead. */
  const EXTS = ["jpg", "jpeg", "png", "webp", "avif"];
  $$(".ph").forEach((slot) => {
    const img = $("img", slot);
    if (!img) return;
    const m = (img.getAttribute("src") || "").match(/^(.*)\.([a-z0-9]+)$/i);
    if (!m) return;
    const base = m[1];
    const tried = [m[2].toLowerCase()];
    const btn = slot.tagName === "BUTTON" ? slot : null;

    const setEmpty = (empty) => {
      slot.classList.toggle("is-empty", empty);
      if (btn) btn.disabled = empty;
    };
    const next = () => {
      const e = EXTS.find((x) => !tried.includes(x));
      if (!e) { setEmpty(true); return; }
      tried.push(e);
      img.src = `${base}.${e}`;
    };
    img.addEventListener("error", next);
    img.addEventListener("load", () => setEmpty(false));
    if (img.complete) { img.naturalWidth === 0 ? next() : setEmpty(false); }   // may have failed before this script ran
  });

  /* ---------- Gallery filter: photos glide to their new places ---------- */
  const shots = $$("#gallery-grid .shot");
  const filterBtns = $$(".filter");
  filterBtns.forEach((b) => b.addEventListener("click", () => {
    const f = b.dataset.filter;
    filterBtns.forEach((x) => {
      const on = x === b;
      x.classList.toggle("is-active", on);
      x.setAttribute("aria-pressed", String(on));
    });
    const first = new Map(shots.filter((s) => !s.hidden).map((s) => [s, s.getBoundingClientRect()]));   // FLIP: First
    shots.forEach((s) => { s.hidden = !(f === "all" || s.dataset.cat === f); });                       //       Last
    if (reduceMotion || !shots[0].animate) return;
    let n = 0;
    shots.filter((s) => !s.hidden).forEach((s) => {                                                    //       Invert + Play
      const was = first.get(s), now = s.getBoundingClientRect();
      const ease = "cubic-bezier(.2,.7,.2,1)";
      if (was) {
        const dx = was.left - now.left, dy = was.top - now.top;
        if (dx || dy) s.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 650, easing: ease });
      } else {
        s.animate([{ opacity: 0, transform: "scale(.92)" }, { opacity: 1, transform: "none" }], { duration: 600, easing: ease, delay: 60 * n++ });
      }
    });
  }));

  /* ---------- Lightbox: works for any group of photos marked data-lb-group ---------- */
  const lb = $("#lightbox");
  if (lb) {
    const lbImg = $("#lbImg"), lbCap = $("#lbCap");
    let group = [], current = -1, opener = null;

    const itemsOf = (g) => $$("button.ph", g).filter((b) => !b.disabled && !b.closest("[hidden]") && !b.classList.contains("is-empty"));
    const show = (i) => {
      if (!group.length) return;
      current = (i + group.length) % group.length;
      const btn = group[current], img = $("img", btn);
      lbImg.classList.remove("swap"); void lbImg.offsetWidth; lbImg.classList.add("swap");
      lbImg.src = img.currentSrc || img.src;
      lbImg.alt = img.alt;
      lbCap.textContent = btn.dataset.title || img.alt;
      [1, -1].forEach((d) => { const nb = group[(current + d + group.length) % group.length], ni = $("img", nb); if (ni) new Image().src = ni.currentSrc || ni.src; });   // preload neighbours
    };
    const step = (d) => show(current + d);

    document.addEventListener("click", (e) => {
      const btn = e.target.closest("button.ph");
      const g = btn && btn.closest("[data-lb-group]");
      if (!g || btn.disabled) return;
      group = itemsOf(g); opener = btn;
      show(group.indexOf(btn));
      if (!lb.open) lb.showModal();
    });
    $("#lbPrev").addEventListener("click", () => step(-1));
    $("#lbNext").addEventListener("click", () => step(1));
    $("#lbClose").addEventListener("click", () => lb.close());
    lb.addEventListener("click", (e) => { if (e.target === lb) lb.close(); });
    lb.addEventListener("close", () => { if (opener) opener.focus({ preventScroll: true }); });
    lb.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") step(-1); if (e.key === "ArrowRight") step(1); });
    let x0 = null;                                                                      // swipe on touch screens
    lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1); x0 = null; }, { passive: true });
  }

  /* ---------- Contact: only show what is configured in js/config.js ---------- */
  const cfg = window.SITE || {};
  const list = $("#contactList");
  const ICONS = {
    mail: '<rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/>',
    whatsapp: '<path d="M4 20l1.3-4.2A8 8 0 1 1 8.4 18.8z"/><path d="M9 9.5c.3 2.2 2.3 4.2 5 5l1.2-1.2-1.8-1-.8.7c-.8-.3-1.7-1.1-2-2l.7-.8-1-1.8z"/>',
    facebook: '<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v3H7v4h3v6h4v-6h3l1-4h-4V8z"/>',
    youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9.5 5 2.5-5 2.5z"/>',
    x: '<path d="M4 4l16 16M20 4 4 20"/>'
  };
  if (list) {
    const addContact = (label, text, href, icon) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = href;
      if (/^https?:/.test(href)) { a.target = "_blank"; a.rel = "noopener noreferrer"; }
      a.innerHTML =
        `<span class="c-ico" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[icon]}</svg></span>` +
        `<span><small></small></span>`;
      $("small", a).textContent = label;
      $("span:last-child", a).append(document.createTextNode(text));
      li.appendChild(a);
      list.appendChild(li);
    };
    if (cfg.email) addContact("Email", cfg.email, "mailto:" + cfg.email, "mail");
    if (cfg.whatsapp) addContact("WhatsApp", "+" + cfg.whatsapp.replace(/\D/g, ""), "https://wa.me/" + cfg.whatsapp.replace(/\D/g, ""), "whatsapp");
    if (cfg.facebook) addContact("Facebook", "Follow on Facebook", cfg.facebook, "facebook");
    if (cfg.youtube) addContact("YouTube", "Watch on YouTube", cfg.youtube, "youtube");
    if (cfg.x) addContact("X", "Follow on X", cfg.x, "x");
  }
  const form = $("#contactForm");
  if (cfg.email && form) {
    form.hidden = false;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const d = new FormData(form);
      const body = `${d.get("message")}\n\n— ${d.get("name")} (${d.get("email")})`;
      window.location.href = `mailto:${cfg.email}?subject=${encodeURIComponent("Website enquiry from " + d.get("name"))}&body=${encodeURIComponent(body)}`;
    });
  }
})();
