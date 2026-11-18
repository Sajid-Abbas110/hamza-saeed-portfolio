/* =====================================================================================================
   render.js: builds the tournament list, the stats, the certificates and every event page
   from data/portfolio.js. Nothing here needs editing to add an event or a certificate.
   ===================================================================================================== */
(() => {
  "use strict";
  const D = window.PORTFOLIO;
  if (!D) { console.error("data/portfolio.js did not load"); return; }

  const $ = (s, el = document) => el.querySelector(s);
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const mon = (i, long) => (long ? MONTHS[i] : MONTHS[i].slice(0, 3));

  /* ---------- helpers ---------- */
  const events = [...D.events].sort((a, b) => String(b.start).localeCompare(String(a.start)));   // newest first
  const bySlug = (s) => events.find((e) => e.slug === s);
  const url = (e) => `event.html?e=${encodeURIComponent(e.slug)}`;
  const isCaptain = (e) => /captain/i.test(e.role || "");

  function dateParts(e) {                       // { big: "15–22 Jun", small: "2026", full: "15–22 June 2026" }
    if (e.dateLabel) {
      const w = e.dateLabel.split(/\s+/);
      return { big: w[0].slice(0, 3), small: w[w.length - 1], full: e.dateLabel };
    }
    const s = new Date(e.start + "T00:00:00"), t = new Date((e.end || e.start) + "T00:00:00");
    const sd = s.getDate(), td = t.getDate(), sm = s.getMonth(), tm = t.getMonth(), y = t.getFullYear();
    if (e.start === e.end || !e.end) return { big: `${sd} ${mon(sm)}`, small: String(y), full: `${sd} ${mon(sm, 1)} ${y}` };
    if (sm === tm) return { big: `${sd}–${td} ${mon(sm)}`, small: String(y), full: `${sd}–${td} ${mon(sm, 1)} ${y}` };
    return { big: `${sd} ${mon(sm)} – ${td} ${mon(tm)}`, small: String(y), full: `${sd} ${mon(sm, 1)} – ${td} ${mon(tm, 1)} ${y}` };
  }
  const place = (e) => [e.venue, e.city !== e.venue ? e.city : "", e.country].filter(Boolean).join(", ");
  const coverSrc = (e) => (e.cover ? `images/events/${e.slug}/${e.cover}` : (e.photos?.[0]?.src || ""));

  const ICONS = {
    certificate: '<path d="M6 3h12a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M8.5 7h7M8.5 10h4"/><circle cx="15.5" cy="16.5" r="3"/><path d="m14 19-1 3 2.5-1.2L18 22l-1-3"/>',
    medal: '<circle cx="12" cy="15" r="5.5"/><path d="M8.5 10.5 6 3h4l2 4.5L14 3h4l-2.5 7.5"/><path d="m10 15 1.5 1.5L14.5 13"/>',
    pin: '<path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    flag: '<path d="M5 21V4M5 5h11l-2 3.5L16 12H5"/>'
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[n] || ICONS.certificate}</svg>`;

  /* ---------- HOME PAGE: stats + tournament list ---------- */
  function renderHome() {
    const list = $("#tourList");
    if (list) {
      list.innerHTML = events.map((e) => {
        const d = dateParts(e);
        const fmts = (e.formats || []).map((f) => `<li>${esc(f)}</li>`).join("");
        const nations = (e.nations || []).length ? `<p class="tour-vs"><strong>Nations in the draw:</strong> ${e.nations.map(esc).join(" &middot; ")}</p>` : "";
        const badges = [e.result ? `<span class="badge badge--accent">${esc(e.result)}</span>` : "", isCaptain(e) ? '<span class="badge">Captain</span>' : ""].join("");
        const cover = coverSrc(e);
        return `<li class="tour reveal"><a class="tour-link" href="${url(e)}" aria-label="${esc(e.name)} ${esc(e.edition || "")}: event details">
            <div class="tour-date"><b>${esc(d.big)}</b><span>${esc(d.small)}</span></div>
            <div class="tour-main">
              <h3>${esc(e.name)}${e.edition && !/^\d{4}$/.test(e.edition) ? ` <span class="accent">${esc(e.edition)}</span>` : ""}</h3>
              <p class="tour-venue">${esc(place(e))}</p>
              ${fmts ? `<ul class="fmt">${fmts}</ul>` : ""}${nations}
              ${badges ? `<div class="tour-badges">${badges}</div>` : ""}
              <span class="tour-more">Event details <i>&rarr;</i></span>
            </div>
            ${cover ? `<div class="ph tour-thumb" aria-hidden="true"><img src="${esc(cover)}" alt="" loading="lazy" decoding="async" style="object-position:${esc(e.coverPos || "50% 40%")}"></div>` : "<div></div>"}
          </a></li>`;
      }).join("");
    }

    const stats = $("#tourStats");
    if (stats) {
      const years = events.map((e) => +String(e.start).slice(0, 4));
      const countries = [...new Set(events.map((e) => e.country).filter(Boolean))];
      const nations = [...new Set(events.flatMap((e) => e.nations || []))];
      const span = Math.min(...years) === Math.max(...years) ? String(years[0]) : `${Math.min(...years)}–${Math.max(...years)}`;
      stats.innerHTML = `
        <li><strong data-count="${events.length}">${events.length}</strong><span>International events<br>${span}</span></li>
        <li><strong data-count="${countries.length}">${countries.length}</strong><span>Host countries<br>${countries.map(esc).join(", ")}</span></li>
        <li><strong data-count="${nations.length}">${nations.length}</strong><span>Nations in his match<br>fixtures</span></li>`;
    }
  }

  /* ---------- HOME PAGE: certificates ---------- */
  function renderCertificates() {
    const grid = $("#certGrid");
    if (!grid) return;
    const certs = D.certifications || [];
    if (!certs.length) { grid.innerHTML = '<p class="section-sub">Certificates will appear here.</p>'; return; }
    grid.innerHTML = certs.map((c) => {
      const ev = c.event ? bySlug(c.event) : null;
      const meta = [c.issuer, c.date].filter(Boolean).map(esc).join(" &middot; ");
      const thumb = c.image ? `<button type="button" class="ph cert-thumb" data-title="${esc(c.title)}"><img src="${esc(c.image)}" alt="${esc(c.title)}" loading="lazy" decoding="async"></button>` : "";
      const actions = [
        c.image ? '<button type="button" data-open-thumb>View certificate</button>' : "",
        c.file ? `<a href="${esc(c.file)}" target="_blank" rel="noopener noreferrer">Open PDF</a>` : "",
        ev ? `<a href="${url(ev)}">Event details &rarr;</a>` : ""
      ].join("");
      return `<article class="cert reveal">
          <div class="cert-ico">${icon(/medal/i.test(c.type) ? "medal" : "certificate")}</div>
          <p class="cert-type">${esc(c.type || "Certificate")}</p>
          <h3>${esc(c.title)}</h3>
          ${meta ? `<p class="cert-meta">${meta}</p>` : ""}
          ${c.description ? `<p>${esc(c.description)}</p>` : ""}
          ${thumb}
          ${actions ? `<div class="cert-actions">${actions}</div>` : ""}
        </article>`;
    }).join("");
    grid.querySelectorAll("[data-open-thumb]").forEach((b) => b.addEventListener("click", () => b.closest(".cert").querySelector(".cert-thumb")?.click()));
  }

  /* ---------- EVENT PAGE ---------- */
  function renderEvent() {
    const root = $("#eventRoot");
    if (!root) return;
    const slug = new URLSearchParams(location.search).get("e") || location.hash.slice(1);
    const e = bySlug(slug);
    if (!e) {
      document.title = "Event not found | " + D.profile.name;
      root.innerHTML = `<section class="ev-empty"><div class="container"><h1>Event not found</h1><p class="section-sub" style="margin:0 auto 28px">That event does not exist (yet).</p><a class="btn btn--accent" href="index.html#tournaments">See all tournaments</a></div></section>`;
      return;
    }
    const d = dateParts(e), i = events.indexOf(e);
    const newer = events[i - 1], older = events[i + 1];
    const certs = (D.certifications || []).filter((c) => c.event === e.slug);
    const photos = e.photos || [];
    const title = e.name + (e.edition ? " " + e.edition : "");

    document.title = `${title} | ${D.profile.name}`;
    const desc = `${title}: ${e.summary || ""} ${place(e)}, ${d.full}. ${D.profile.name}, ${D.profile.role}.`.replace(/\s+/g, " ").trim();
    let m = $('meta[name="description"]'); if (m) m.setAttribute("content", desc);
    m = $('meta[property="og:title"]'); if (m) m.setAttribute("content", `${title} | ${D.profile.name}`);
    m = $('meta[property="og:description"]'); if (m) m.setAttribute("content", desc);

    const facts = [
      ["Dates", d.full], ["Venue", place(e)], ["Role", e.role], ["Result", e.result], ["Level", e.level],
      ["Events", (e.formats || []).length ? `${e.formats.length} (${e.formats.join(", ")})` : ""],
      ["Nations", (e.nations || []).join(", ")]
    ].filter(([, v]) => v).map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join("");

    const fixtures = (e.fixtures || []).filter((f) => f.format).map((f) => {
      const bits = [];
      if (f.partner) bits.push(`Partner: <b>${esc(f.partner)}</b>`);
      if (f.note) bits.push(esc(f.note));
      const vs = (f.vs || []).length ? `<ul class="fx-nations" aria-label="Opponents from">${f.vs.map((n) => `<li>${esc(n)}</li>`).join("")}</ul>` : "";
      return `<li class="fx"><div class="fx-name">${esc(f.format)}</div><div class="fx-detail">${bits.join(" &middot; ")}${vs}</div></li>`;
    }).join("");

    const story = (e.story || []).map((p) => `<p>${esc(p)}</p>`).join("");
    const quote = e.quote ? `<blockquote class="ev-quote">&ldquo;${esc(e.quote)}&rdquo;<small>${esc(D.profile.shortName || D.profile.name)}</small></blockquote>` : "";

    const gallery = photos.map((p) => `<li class="ev-photo"><button type="button" class="ph" data-title="${esc(p.caption)}" style="aspect-ratio:${+p.w || 3} / ${+p.h || 2}">
        <img src="${esc(p.src)}" width="${+p.w || ""}" height="${+p.h || ""}" alt="${esc(p.caption)}, ${esc(title)}" loading="lazy" decoding="async">
        <span class="shot-cap"><b>${esc(p.caption)}</b><i>${esc(title)}</i></span></button></li>`).join("");

    const links = (e.links || []).map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer"><span>${esc(l.label)}</span><span>&nearr;</span></a>`).join("");
    const certCard = certs.length ? `<div class="ev-card"><h3>Certificates</h3><div class="ev-links">${certs.map((c) => `<a href="index.html#certificates"><span>${esc(c.title)}</span><span>&rarr;</span></a>`).join("")}</div></div>` : "";
    const cover = coverSrc(e);

    root.innerHTML = `
      <section class="ev-hero">
        <div class="container">
          <a class="ev-crumb" href="index.html#tournaments"><i>&larr;</i> All tournaments</a>
          <p class="eyebrow">${esc([e.level, d.small].filter(Boolean).join(" · "))}</p>
          <h1 class="ev-title split-title">${esc(e.name)}${e.edition ? ` <em class="accent">${esc(e.edition)}</em>` : ""}</h1>
          ${e.summary ? `<p class="ev-lead">${esc(e.summary)}</p>` : ""}
          <ul class="ev-meta">
            <li>${icon("cal")}${esc(d.full)}</li>
            <li>${icon("pin")}${esc(place(e))}</li>
            ${e.role ? `<li>${icon("flag")}${esc(e.role)}</li>` : ""}
            ${e.result ? `<li><span class="badge badge--accent">${esc(e.result)}</span></li>` : ""}
          </ul>
          ${cover ? `<div class="ph ev-cover"><img src="${esc(cover)}" alt="${esc(title)}" fetchpriority="high" decoding="async" style="object-position:${esc(e.coverPos || "50% 40%")}"></div>` : ""}
        </div>
      </section>
      <div class="container ev-layout">
        <div class="ev-main">
          ${story || quote ? `<section class="ev-story reveal"><h2 class="ev-h">The event</h2>${story}${quote}</section>` : ""}
          ${fixtures ? `<section class="reveal"><h2 class="ev-h">Fixtures</h2><ul class="fixtures">${fixtures}</ul></section>` : ""}
          ${gallery ? `<section><h2 class="ev-h reveal">Photos</h2><ul class="ev-gallery" data-lb-group>${gallery}</ul></section>` : ""}
        </div>
        <aside class="ev-aside">
          <div class="ev-card reveal"><h3>At a glance</h3><dl class="facts">${facts}</dl></div>
          ${certCard}
          ${links ? `<div class="ev-card"><h3>Links</h3><div class="ev-links">${links}</div></div>` : ""}
        </aside>
      </div>
      <nav class="ev-nav" aria-label="More events"><div class="container ev-nav-inner">
        ${newer ? `<a href="${url(newer)}"><small>&larr; Newer event</small><b>${esc(newer.name)}${newer.edition ? " " + esc(newer.edition) : ""}</b><span>${esc(dateParts(newer).full)}</span></a>` : "<span></span>"}
        ${older ? `<a href="${url(older)}"><small>Older event &rarr;</small><b>${esc(older.name)}${older.edition ? " " + esc(older.edition) : ""}</b><span>${esc(dateParts(older).full)}</span></a>` : "<span></span>"}
      </div></nav>`;

    // structured data for search engines
    const ld = { "@context": "https://schema.org", "@type": "SportsEvent", name: title, startDate: e.start, endDate: e.end || e.start,
      location: { "@type": "Place", name: e.venue, address: { "@type": "PostalAddress", addressLocality: e.city, addressCountry: e.country } },
      competitor: { "@type": "Person", name: D.profile.name } };
    const s = document.createElement("script"); s.type = "application/ld+json"; s.textContent = JSON.stringify(ld); document.head.appendChild(s);
  }

  renderHome();
  renderCertificates();
  renderEvent();
  window.Portfolio = { events, bySlug };
})();
