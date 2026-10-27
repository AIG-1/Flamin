/* Flamin Chicken & Gyro — renders every page from /content/*.json (edited in /admin) */
(async function () {
  const get = (p) => fetch(p, { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
  const [site, menu, banner, specials, gallery, reviews] = await Promise.all([
    get("/content/site.json"), get("/content/menu.json"), get("/content/banner.json"),
    get("/content/specials.json"), get("/content/gallery.json"), get("/content/reviews.json"),
  ]);
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const cats = (menu.categories || []).filter((c) => c.show !== false);
  const allItems = cats.flatMap((c) => c.items.map((i) => ({ ...i, cat: c })));
  const findItem = (id) => allItems.find((i) => i.id === id);
  const orderLinks = (item) => {
    const list = item && item.orderLinks && item.orderLinks.length ? item.orderLinks : site.orderLinks || [];
    return list.filter((l) => l.show !== false && l.url);
  };

  /* ---------- Hours / open-now (America/Chicago) ---------- */
  const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const nowCT = () => {
    const p = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", weekday: "long", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
      .formatToParts(new Date()).map((x) => [x.type, x.value]));
    return { day: DAYS.indexOf(p.weekday), min: +p.hour * 60 + +p.minute };
  };
  const toMin = (t) => { const [h, m] = String(t || "0:0").split(":").map(Number); return h * 60 + (m || 0); };
  const fmt = (t) => { let m = toMin(t) % 1440, h = Math.floor(m / 60), mm = m % 60; const ap = h >= 12 ? "PM" : "AM"; h = h % 12 || 12; return `${h}${mm ? ":" + String(mm).padStart(2, "0") : ""} ${ap}`; };
  function isOpen() {
    const hrs = site.hours || []; const { day, min } = nowCT();
    const chk = (d, offset) => {
      const h = hrs.find((x) => x.day === DAYS[(d + 7) % 7]); if (!h || h.closed) return false;
      let o = toMin(h.open), c = toMin(h.close); if (c <= o) c += 1440;
      const t = min + offset; return t >= o && t < c;
    };
    return chk(day, 0) || chk(day - 1, 1440);
  }
  const open = isOpen();
  document.querySelectorAll("[data-status]").forEach((el) => { el.className = "status " + (open ? "open" : "closed"); el.textContent = open ? "Open now" : "Closed now"; });

  /* ---------- Shared bits ---------- */
  if (site.background) $(".bg").style.backgroundImage = `url('${site.background}')`;
  document.querySelectorAll("[data-logo]").forEach((el) => (el.src = site.logo || el.src));
  const ann = $("#announce");
  if (ann && site.announcement && site.announcement.show && site.announcement.text) {
    ann.hidden = false;
    ann.innerHTML = site.announcement.link ? `<a href="${esc(site.announcement.link)}">${esc(site.announcement.text)}</a>` : esc(site.announcement.text);
  }
  if (site.holidayNotice && ann) { ann.hidden = false; ann.innerHTML += (ann.innerHTML ? " &nbsp;•&nbsp; " : "") + esc(site.holidayNotice); }
  $(".menu-toggle")?.addEventListener("click", () => $(".nav nav").classList.toggle("open"));
  document.querySelectorAll("[data-order-btns]").forEach((el) => {
    el.innerHTML = orderLinks().map((l) => `<a class="btn" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("") +
      (site.phone ? `<a class="btn ghost" href="tel:${esc(site.phone.replace(/[^0-9+]/g, ""))}">Call ${esc(site.phone)}</a>` : "");
  });
  const ft = $("#footer-info");
  if (ft) ft.innerHTML = `<div><b style="color:#fff">${esc(site.name)}</b><br>${esc(site.address)}, ${esc(site.city)}${site.phone ? "<br>" + esc(site.phone) : ""}<br>
    <a href="${esc(site.instagram)}" target="_blank" rel="noopener">Instagram</a></div>
    <div class="disclaimer">Menu items and prices are subject to change. Prices on delivery apps may differ from in-store prices. Photos are representative.</div>`;

  /* ---------- Card ---------- */
  function card(it) {
    const opts = (it.options || []).filter((o) => o.label || o.price);
    let price;
    if (it.priceConfirmed === false || !opts.some((o) => o.price)) price = `<p class="pending">Price coming soon — ask in store</p>`;
    else if (opts.length === 1 && !opts[0].label) price = `<ul class="opts"><li class="single"><span></span><span>${esc(opts[0].price)}</span></li></ul>`;
    else price = `<ul class="opts">${opts.map((o) => `<li><span>${esc(o.label)}</span><span>${esc(o.price)}</span></li>`).join("")}</ul>`;
    const links = orderLinks(it);
    const img = it.image ? `<div class="img"><img src="${esc(it.image)}" alt="${esc(it.name)}" loading="lazy"></div>`
      : `<div class="img empty"><img src="${esc(site.logo)}" alt=""></div>`;
    return `<article class="card${it.soldOut ? " sold" : ""}" id="${esc(it.id)}">${img}
      <div class="body">
        ${it.tags && it.tags.length ? `<div class="tags">${it.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>` : ""}
        <h3>${esc(it.name)}</h3>
        ${it.description ? `<p class="desc">${esc(it.description)}</p>` : ""}
        ${price}
        ${links.length ? `<div class="order-label">Order now</div><div class="order">${links.map((l) => `<a href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label)}</a>`).join("")}</div>` : ""}
      </div></article>`;
  }

  /* ---------- Home ---------- */
  const slider = $("#slider");
  if (slider) {
    const slides = (banner.slides || []).filter((s) => s.show !== false);
    slider.innerHTML = slides.map((s, i) => {
      const href = s.itemId ? `/menu.html#${encodeURIComponent(s.itemId)}` : "/menu.html";
      const H = i === 0 ? "h1" : "h2";
      return `<div class="slide${i === 0 ? " on" : ""}"><div class="copy">
        <${H}><a href="${href}">${esc(s.headline)}</a></${H}>
        <p><a href="${href}">${esc(s.subtext)}</a></p>
        <a class="btn" href="${href}">View on menu</a></div>
        <a class="pic" href="${href}">${s.image ? `<img src="${esc(s.image)}" alt="${esc(s.headline)}">` : ""}</a></div>`;
    }).join("") + `<div class="dots">${slides.map((_, i) => `<button aria-label="Slide ${i + 1}" class="${i ? "" : "on"}"></button>`).join("")}</div>`;
    let cur = 0; const els = slider.querySelectorAll(".slide"), dots = slider.querySelectorAll(".dots button");
    const go = (n) => { els[cur]?.classList.remove("on"); dots[cur]?.classList.remove("on"); cur = (n + els.length) % els.length; els[cur]?.classList.add("on"); dots[cur]?.classList.add("on"); };
    dots.forEach((d, i) => d.addEventListener("click", () => { go(i); clearInterval(t); }));
    let t = els.length > 1 ? setInterval(() => go(cur + 1), 5500) : null;
  }
  const vid = $("#video");
  if (vid) {
    const v = site.video || {};
    const yt = (v.youtubeUrl || "").match(/(?:youtu\.be\/|v=|shorts\/|embed\/)([\w-]{11})/);
    const ig = (v.instagramUrl || "").match(/instagram\.com\/(?:[\w.]+\/)?(reel|p)\/([\w-]+)/);
    if (v.file) vid.innerHTML = `<video src="${esc(v.file)}" ${v.poster ? `poster="${esc(v.poster)}"` : ""} controls playsinline preload="metadata"></video>`;
    else if (yt) vid.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${yt[1]}" title="${esc(v.title)}" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
    else if (ig) { vid.classList.add("ig"); vid.innerHTML = `<iframe src="https://www.instagram.com/${ig[1]}/${ig[2]}/embed" title="${esc(v.title)}" loading="lazy" allowfullscreen scrolling="no"></iframe>`; }
    else vid.innerHTML = `<div class="ph" style="background-image:url('${esc(v.poster || "")}')"><b>${esc(v.title || "Video")}</b><span>Video coming soon</span></div>`;
    $("#video-title") && ($("#video-title").textContent = v.title || "");
    $("#halal-badge") && (site.halal ? null : $("#halal-badge").remove());
  }
  const feat = $("#featured");
  if (feat) feat.innerHTML = allItems.filter((i) => i.featured).map(card).join("");
  const sp = $("#specials");
  if (sp) {
    const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
    const live = (specials.specials || []).filter((s) => s.show !== false && (!s.start || s.start <= today) && (!s.end || s.end >= today));
    if (!live.length) sp.closest("section").remove();
    else sp.innerHTML = live.map((s) => `<div class="special"><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p>${s.itemId ? `<p style="margin-top:12px"><a class="btn" href="/menu.html#${esc(s.itemId)}">See it</a></p>` : ""}</div>`).join("");
  }
  /* ---------- Gallery (newest first) ---------- */
  const igMatch = (u) => (u || "").match(/instagram\.com\/(?:[\w.]+\/)?(reel|p)\/([\w-]+)/);
  const media = (g, big) => {
    const ig = g.type === "instagram" && igMatch(g.instagram || g.src);
    const cap = g.caption ? `<figcaption>${esc(g.caption)}${g.date ? ` <span class="date">${esc(new Date(g.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }))}</span>` : ""}</figcaption>` : "";
    if (ig) return `<figure class="ig${big ? " big" : ""}"><iframe src="https://www.instagram.com/${ig[1]}/${ig[2]}/embed" title="${esc(g.caption || "Instagram post")}" loading="lazy" scrolling="no" allowfullscreen></iframe>${cap}</figure>`;
    if (g.type === "video") return `<figure${big ? ' class="big"' : ""}><video src="${esc(g.src)}" controls playsinline preload="metadata"></video>${cap}</figure>`;
    return `<figure><img src="${esc(g.src)}" alt="${esc(g.caption)}" loading="lazy">${cap}</figure>`;
  };
  const gItems = (gallery.items || []).filter((g) => g.show !== false && (g.src || g.instagram)).sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  const latestVid = gItems.find((g) => g.type === "video" || g.type === "instagram");
  const gTop = $("#gallery-top"), gal = $("#gallery");
  if (gTop && latestVid) gTop.innerHTML = `<div class="latest-label">Latest video</div>` + media(latestVid, true);
  if (gal) {
    const rest = gTop ? gItems.filter((g) => g !== latestVid) : gItems;
    const lim = +gal.dataset.limit || rest.length;
    gal.innerHTML = rest.slice(0, lim).map((g) => media(g)).join("");
  }

  /* ---------- Reviews ---------- */
  const rv = $("#reviews-list");
  if (rv) {
    const list = (reviews.reviews || []).filter((r) => r.show !== false);
    const stars = (n) => { n = Math.max(0, Math.min(5, +n || 0)); return `<span class="stars" aria-label="${n} out of 5 stars">${"★".repeat(n)}<span>${"★".repeat(5 - n)}</span></span>`; };
    rv.innerHTML = list.length ? list.map((r) => `<div class="review">${stars(r.rating)}<p>${esc(r.text)}</p><div class="who"><b>${esc(r.name)}</b>${r.location ? ` · ${esc(r.location)}` : ""}</div></div>`).join("")
      : `<div class="review empty"><p>Be the first to review us. Tell us what you ordered below.</p></div>`;
    const cr = $("#creators");
    const cl = (reviews.creators || []).filter((c) => c.show !== false && igMatch(c.instagram));
    if (cr && cl.length) cr.innerHTML = cl.map((c) => { const m = igMatch(c.instagram); return `<figure class="ig"><iframe src="https://www.instagram.com/${m[1]}/${m[2]}/embed" title="${esc(c.name)} on Instagram" loading="lazy" scrolling="no"></iframe><figcaption>${esc(c.name)}</figcaption></figure>`; }).join("");
    else if (cr) cr.closest(".creators-wrap")?.remove();
  }
  const hrs = $("#hours");
  if (hrs) {
    const d = nowCT().day;
    hrs.innerHTML = (site.hours || []).map((h) => `<li class="${h.day === DAYS[d] ? "today" : ""}"><span>${esc(h.day)}</span><span>${h.closed ? "Closed" : fmt(h.open) + " – " + fmt(h.close)}</span></li>`).join("");
    $("#addr").innerHTML = `${esc(site.address)}<br>${esc(site.city)}${site.phone ? `<br><a href="tel:${esc(site.phone.replace(/[^0-9+]/g, ""))}">${esc(site.phone)}</a>` : ""}`;
    $("#dir").href = site.mapsUrl;
    $("#map").src = "https://maps.google.com/maps?q=" + encodeURIComponent(site.address + ", " + site.city) + "&z=15&output=embed";
  }

  /* ---------- Menu page ---------- */
  const mp = $("#menu");
  if (mp) {
    $("#cat-bar").innerHTML = cats.map((c) => `<a href="#cat-${esc(c.id)}">${esc(c.name)}</a>`).join("");
    mp.innerHTML = cats.map((c) => `<div class="cat" id="cat-${esc(c.id)}"><h2 class="h">${esc(c.name)}</h2>${c.note ? `<p class="note">${esc(c.note)}</p>` : ""}<div class="grid">${c.items.map(card).join("")}</div></div>`).join("");
    $("#q").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      mp.querySelectorAll(".card").forEach((el) => (el.hidden = q && !el.textContent.toLowerCase().includes(q)));
      mp.querySelectorAll(".cat").forEach((el) => (el.hidden = q && !el.querySelector(".card:not([hidden])")));
    });
    const flash = () => {
      const id = decodeURIComponent(location.hash.slice(1)); const el = id && document.getElementById(id);
      if (el && el.classList.contains("card")) { el.scrollIntoView({ behavior: "smooth", block: "center" }); el.classList.add("flash"); setTimeout(() => el.classList.remove("flash"), 2600); }
      else if (el) el.scrollIntoView();
    };
    window.addEventListener("hashchange", flash); setTimeout(flash, 150);
  }
})();
