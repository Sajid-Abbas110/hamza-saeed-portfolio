/* =====================================================================================================
   motion.js: all the animation. Each effect is isolated (safe()) so one failing never breaks the page,
   and everything is skipped for visitors who ask their device for reduced motion.
   ===================================================================================================== */
(() => {
  "use strict";
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const safe = (name, fn) => { try { fn(); } catch (err) { console.error("[motion:" + name + "]", err); } };
  const raf = (fn) => { let q = false; return (...a) => { if (q) return; q = true; requestAnimationFrame(() => { q = false; fn(...a); }); }; };

  /* ---------- 1. Hero entrance: starts when fonts and the hero photo are ready (3.5 s safety net is in index.html) ---------- */
  safe("entrance", () => {
    const heroImg = $(".portrait img");
    const fonts = (document.fonts && document.fonts.ready) || Promise.resolve();
    const photo = heroImg && !heroImg.complete ? new Promise((r) => { heroImg.addEventListener("load", r); heroImg.addEventListener("error", r); }) : Promise.resolve();
    const cap = (ms) => new Promise((r) => setTimeout(r, ms));
    Promise.all([Promise.race([fonts, cap(1200)]), Promise.race([photo, cap(1500)])]).then(() => requestAnimationFrame(() => root.classList.add("is-loaded")));
  });

  /* ---------- 2. Scroll progress line, back-to-top ring, header that tucks away ---------- */
  const progress = $("#progress"), fab = $("#fab"), header = $("#siteHeader");
  const parallaxItems = [];
  let lastY = window.scrollY;

  const onScroll = raf(() => {
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    if (progress) progress.style.setProperty("--p", p.toFixed(4));
    if (fab) { fab.style.setProperty("--p", p.toFixed(4)); fab.classList.toggle("is-on", y > 700); }
    if (header && !reduce) {
      const dy = y - lastY;
      if (y > 260 && dy > 8 && !document.body.classList.contains("nav-open")) header.classList.add("is-hidden");
      else if (dy < -6 || y <= 260) header.classList.remove("is-hidden");
    }
    lastY = y;
    parallax();
  });
  safe("scroll", () => {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    if (header) header.addEventListener("focusin", () => header.classList.remove("is-hidden"));
    if (fab) fab.addEventListener("click", () => window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" }));
    onScroll();
  });

  if (reduce) return;   // everything below is movement

  /* ---------- 3. Parallax: elements with data-speed drift at a different pace from the page ---------- */
  safe("parallax", () => { $$("[data-speed]").forEach((el) => parallaxItems.push({ el, s: parseFloat(el.dataset.speed) || 0 })); });
  function parallax() {
    if (!parallaxItems.length) return;
    const vh = window.innerHeight;
    parallaxItems.forEach(({ el, s }) => {
      const r = (el.parentElement || el).getBoundingClientRect();        // measure the parent so the element's own movement is not fed back in
      if (r.bottom < -300 || r.top > vh + 300) return;
      const c = r.top + r.height / 2 - vh / 2;
      el.style.transform = `translate3d(0, ${(-c * s).toFixed(1)}px, 0)`;
    });
  }

  /* ---------- 4. Section titles: words slide up out of a mask ---------- */
  safe("split", () => {
    const titles = $$(".section-title, .split-title");
    titles.forEach((el) => {
      el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
      let i = 0;
      const walk = (node) => {
        [...node.childNodes].forEach((n) => {
          if (n.nodeType === 3) {
            const frag = document.createDocumentFragment();
            n.textContent.split(/(\s+)/).forEach((part) => {
              if (!part) return;
              if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(" ")); return; }
              const w = document.createElement("span"); w.className = "w"; w.setAttribute("aria-hidden", "true");
              const inner = document.createElement("span"); inner.textContent = part; inner.style.setProperty("--i", i++);
              w.appendChild(inner); frag.appendChild(w);
            });
            n.replaceWith(frag);
          } else if (n.nodeType === 1 && n.tagName !== "BR") walk(n);
        });
      };
      walk(el);
      el.classList.add("split");
    });
    if (!("IntersectionObserver" in window)) { titles.forEach((t) => t.classList.add("is-in")); return; }
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } }), { threshold: 0.35 });
    titles.forEach((t) => io.observe(t));
  });

  /* ---------- 5. Photos open like a curtain with a slow zoom-out ---------- */
  safe("curtain", () => {
    if (!("IntersectionObserver" in window)) return;
    const frames = $$(".ph").filter((p) => !p.classList.contains("portrait"));
    const io = new IntersectionObserver((entries) => entries.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } }), { threshold: 0.12, rootMargin: "0px 0px -5% 0px" });
    frames.forEach((p) => {
      const siblings = p.closest("ul, ol, .journey, .disc-grid, .about-media");
      const idx = siblings ? [...siblings.querySelectorAll(".ph")].indexOf(p) : 0;
      p.style.setProperty("--d", (idx % 4) * 90 + "ms");
      p.classList.add("rv");
      const img = p.querySelector("img");
      const done = () => { p.classList.remove("rv"); p.style.removeProperty("--d"); };      // once open, hand the photo back to normal hover behaviour
      if (img) img.addEventListener("transitionend", (e) => { if (e.propertyName === "clip-path" && p.classList.contains("is-in")) done(); });
      io.observe(p);
    });
  });

  /* ---------- 6. Numbers count up ---------- */
  safe("count", () => {
    const nums = $$("[data-count]");
    if (!nums.length || !("IntersectionObserver" in window)) return;
    nums.forEach((n) => { n.textContent = "0"; });
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      const to = +en.target.dataset.count, t0 = performance.now(), dur = 1500;
      const tick = (now) => { const t = Math.min(1, (now - t0) / dur); en.target.textContent = Math.round(to * ease(t)); if (t < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }), { threshold: 0.6 });
    nums.forEach((n) => io.observe(n));
  });

  /* ---------- 7. Pointer effects (mouse only): hero spotlight, portrait tilt, magnetic buttons ---------- */
  safe("pointer", () => {
    if (!finePointer) return;
    const hero = $(".hero"), wrap = $("[data-tilt]");
    if (hero) {
      const move = raf((x, y) => {
        const r = hero.getBoundingClientRect();
        hero.style.setProperty("--mx", (((x - r.left) / r.width) * 100).toFixed(1) + "%");
        hero.style.setProperty("--my", (((y - r.top) / r.height) * 100).toFixed(1) + "%");
        if (wrap) {
          const nx = (x - (r.left + r.width / 2)) / r.width, ny = (y - (r.top + r.height / 2)) / r.height;
          wrap.style.transform = `perspective(1100px) rotateY(${(nx * 9).toFixed(2)}deg) rotateX(${(-ny * 7).toFixed(2)}deg)`;
        }
      });
      if (wrap) wrap.style.transition = "transform 0.7s cubic-bezier(.2,.7,.2,1)";
      hero.addEventListener("pointermove", (e) => move(e.clientX, e.clientY));
      hero.addEventListener("pointerleave", () => { if (wrap) wrap.style.transform = ""; });
    }
    $$(".hero-actions .btn, .nav-cta").forEach((b) => {
      b.addEventListener("pointermove", (e) => {
        const r = b.getBoundingClientRect();
        const dx = ((e.clientX - (r.left + r.width / 2)) / r.width) * 10, dy = ((e.clientY - (r.top + r.height / 2)) / r.height) * 8;
        b.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
      });
      b.addEventListener("pointerleave", () => { b.style.transform = ""; });
    });
  });
})();
