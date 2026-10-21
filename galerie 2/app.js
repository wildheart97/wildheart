(() => {
  "use strict";

  const CFG = Object.assign({
    title: "galerie", subtitle: "", footer: "", root: "images",
    manifest: "manifest.json", defaultFormat: "url", github: null, imageBase: ""
  }, window.SITE || {});

  const IMG_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;
  const collator = new Intl.Collator("fr", { numeric: true, sensitivity: "base" });
  const $ = (s) => document.querySelector(s);
  const main = $("#main");

  /* ---------- petites aides ---------- */
  const store = {
    get(k) { try { return localStorage.getItem("galerie:" + k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem("galerie:" + k, v); } catch {} }
  };
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const norm = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const stem = (name) => name.replace(/\.[^.]+$/, "");
  const encPath = (p) => p.split("/").map(encodeURIComponent).join("/");

  function imageUrl(rel) {
    const p = encPath(CFG.root ? CFG.root + "/" + rel : rel);
    if (CFG.imageBase) return CFG.imageBase.replace(/\/?$/, "/") + p;
    return new URL(p, document.baseURI).href;
  }

  const FORMATS = {
    url: (u) => u,
    bbcode: (u) => `[img]${u}[/img]`,
    html: (u) => `<img src="${u}" alt="">`,
    markdown: (u) => `![](${u})`
  };
  let format = FORMATS[store.get("format")] ? store.get("format") : (FORMATS[CFG.defaultFormat] ? CFG.defaultFormat : "url");
  const codeFor = (img) => FORMATS[format](imageUrl(img.path));

  /* ---------- arbre ---------- */
  const nodes = new Map();
  function makeNode(path, name, parent) {
    const n = { path, name, parent, folders: [], images: [], total: 0, covers: [] };
    nodes.set(path, n);
    if (parent) parent.folders.push(n);
    return n;
  }

  function buildTree(files) {
    nodes.clear();
    const root = makeNode("", CFG.title, null);
    for (const f of files) {
      if (!IMG_RE.test(f)) continue;
      const parts = f.split("/");
      if (parts.some((p) => p.startsWith("."))) continue;
      let cur = root;
      for (let i = 0; i < parts.length - 1; i++) {
        const p = parts.slice(0, i + 1).join("/");
        cur = nodes.get(p) || makeNode(p, parts[i], cur);
      }
      cur.images.push({ name: parts[parts.length - 1], path: f, folder: cur });
    }
    (function finish(n) {
      n.folders.sort((a, b) => collator.compare(a.name, b.name));
      n.images.sort((a, b) => collator.compare(a.name, b.name));
      n.total = n.images.length;
      n.covers = n.images.slice(0, 3);
      for (const c of n.folders) {
        finish(c);
        n.total += c.total;
        if (n.covers.length < 3) n.covers.push(...c.covers.slice(0, 3 - n.covers.length));
      }
    })(root);
    return root;
  }

  async function loadFiles() {
    try {
      const r = await fetch(CFG.manifest, { cache: "no-cache" });
      if (r.ok) {
        const data = await r.json();
        const files = Array.isArray(data) ? data : data.files;
        if (Array.isArray(files)) return files;
      }
    } catch {}
    const gh = CFG.github;
    if (gh && gh.user && gh.repo) {
      const url = `https://api.github.com/repos/${gh.user}/${gh.repo}/git/trees/${gh.branch || "main"}?recursive=1`;
      const r = await fetch(url);
      if (!r.ok) throw new Error("GitHub a répondu " + r.status);
      const data = await r.json();
      const prefix = CFG.root ? CFG.root + "/" : "";
      return data.tree.filter((t) => t.type === "blob" && t.path.startsWith(prefix)).map((t) => t.path.slice(prefix.length));
    }
    throw new Error("Aucun manifest.json trouvé.");
  }

  /* ---------- rendu ---------- */
  let root = null;
  let current = null;
  let currentImages = [];

  const folderGlyph = `<svg class="glyph" viewBox="0 0 48 48" aria-hidden="true"><path d="M6 14a4 4 0 0 1 4-4h9l4 4h15a4 4 0 0 1 4 4v18a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4z"/></svg>`;

  function folderCard(n) {
    const covers = n.covers.map((c, i) => `<img src="${esc(imageUrl(c.path))}" alt="" loading="lazy" style="--i:${i}">`).join("");
    const sub = n.folders.length ? `${n.folders.length} dossier${n.folders.length > 1 ? "s" : ""} · ` : "";
    return `<a class="folder" href="#/${esc(encPath(n.path))}">
      <div class="stack ${covers ? "" : "empty"}" data-n="${n.covers.length}">${covers || folderGlyph}</div>
      <div class="folder-meta">
        <span class="folder-name">${esc(n.name)}</span>
        <span class="folder-count">${sub}${n.total}</span>
      </div>
    </a>`;
  }

  function tile(img, i, showFolder) {
    return `<figure class="tile" data-i="${i}">
      <button class="tile-open" aria-label="Agrandir ${esc(img.name)}"><img src="${esc(imageUrl(img.path))}" alt="${esc(stem(img.name))}" loading="lazy"></button>
      <button class="tile-copy" aria-label="Copier le lien">copier</button>
      <figcaption><span>${esc(stem(img.name))}</span>${showFolder ? `<em>${esc(img.folder.name)}</em>` : `<em class="dim"></em>`}</figcaption>
    </figure>`;
  }

  function renderCrumbs(n) {
    const chain = [];
    for (let c = n; c; c = c.parent) chain.unshift(c);
    $("#crumbs").innerHTML = chain.map((c, i) =>
      i === chain.length - 1
        ? `<span aria-current="page">${esc(i === 0 ? "accueil" : c.name)}</span>`
        : `<a href="#/${esc(encPath(c.path))}">${esc(i === 0 ? "accueil" : c.name)}</a>`
    ).join(`<i class="sep">/</i>`);
  }

  function section(label, count, html, cls) {
    return `<section class="block">
      <h2 class="block-head"><span>${label}</span><span class="rule"></span><span class="num">${count}</span></h2>
      <div class="${cls}">${html}</div>
    </section>`;
  }

  function render(n) {
    current = n;
    currentImages = n.images;
    renderCrumbs(n);
    const isRoot = !n.parent;
    let html = "";
    if (!isRoot) {
      html += `<div class="title-row">
        <a class="back" href="#/${esc(encPath(n.parent.path))}" aria-label="Retour">←</a>
        <h1 class="page-title">${esc(n.name)}</h1>
      </div>`;
    }
    if (n.folders.length) html += section("dossiers", n.folders.length, n.folders.map(folderCard).join(""), "folders");
    if (n.images.length) html += section("images", n.images.length, n.images.map((im, i) => tile(im, i, false)).join(""), "tiles");
    if (!n.folders.length && !n.images.length) html += `<p class="empty-msg">ce dossier est vide pour l'instant.</p>`;
    main.innerHTML = html;
    main.classList.remove("fade"); void main.offsetWidth; main.classList.add("fade");
    bindTiles();
    document.title = isRoot ? CFG.title : `${n.name} — ${CFG.title}`;
  }

  function renderSearch(q) {
    const nq = norm(q.trim());
    const folders = [...nodes.values()].filter((n) => n.parent && norm(n.name).includes(nq)).slice(0, 48);
    const images = [];
    for (const n of nodes.values()) for (const im of n.images) if (norm(stem(im.name)).includes(nq)) images.push(im);
    currentImages = images.slice(0, 120);
    $("#crumbs").innerHTML = `<a href="#/">accueil</a><i class="sep">/</i><span aria-current="page">« ${esc(q.trim())} »</span>`;
    let html = "";
    if (folders.length) html += section("dossiers", folders.length, folders.map(folderCard).join(""), "folders");
    if (currentImages.length) html += section("images", images.length, currentImages.map((im, i) => tile(im, i, true)).join(""), "tiles");
    if (!html) html = `<p class="empty-msg">rien trouvé pour « ${esc(q.trim())} ».</p>`;
    main.innerHTML = html;
    bindTiles();
  }

  function bindTiles() {
    main.querySelectorAll(".tile").forEach((fig) => {
      const i = +fig.dataset.i;
      fig.querySelector(".tile-open").onclick = () => openLightbox(i);
      const btn = fig.querySelector(".tile-copy");
      btn.onclick = (e) => { e.stopPropagation(); copy(codeFor(currentImages[i]), btn); };
      const img = fig.querySelector("img");
      const setDims = () => { if (img.naturalWidth) fig.querySelector("figcaption .dim, figcaption em").dataset.dims = `${img.naturalWidth}×${img.naturalHeight}`; };
      img.complete ? setDims() : img.addEventListener("load", setDims, { once: true });
      img.addEventListener("load", () => fig.classList.add("in"), { once: true });
      if (img.complete) fig.classList.add("in");
    });
  }

  /* ---------- routage ---------- */
  function route() {
    if (!root) return;
    const q = $("#search").value;
    if (q.trim()) { $("#search").value = ""; }
    const raw = location.hash.replace(/^#\/?/, "");
    const path = raw.split("/").filter(Boolean).map((s) => { try { return decodeURIComponent(s); } catch { return s; } }).join("/");
    render(nodes.get(path) || root);
    window.scrollTo({ top: 0 });
  }

  /* ---------- copie ---------- */
  let toastTimer;
  function toast(msg) {
    const t = $("#toast");
    // la boîte d'aperçu passe au-dessus de tout : on y déplace la notification
    const host = lb.open ? lb : document.body;
    if (t.parentNode !== host) host.appendChild(t);
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 1600);
  }

  async function copy(text, btn) {
    let ok = false;
    try { await navigator.clipboard.writeText(text); ok = true; } catch {
      const ta = document.createElement("textarea");
      ta.value = text; ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { ok = document.execCommand("copy"); } catch {}
      ta.remove();
    }
    toast(ok ? "copié ✓" : "impossible de copier — sélectionne le lien à la main");
    if (btn && ok) {
      const old = btn.textContent;
      btn.textContent = "✓"; btn.classList.add("done");
      setTimeout(() => { btn.textContent = old; btn.classList.remove("done"); }, 1100);
    }
  }

  /* ---------- aperçu ---------- */
  const lb = $("#lightbox");
  let lbIndex = 0;

  function showLb() {
    const img = currentImages[lbIndex];
    if (!img) return;
    const el = $("#lbImg");
    el.classList.remove("ready");
    el.onload = () => {
      el.classList.add("ready");
      $("#lbMeta").textContent = `${el.naturalWidth}×${el.naturalHeight} · ${lbIndex + 1}/${currentImages.length}`;
    };
    el.src = imageUrl(img.path);
    el.alt = stem(img.name);
    $("#lbName").textContent = `${img.folder.name} / ${stem(img.name)}`;
    $("#lbMeta").textContent = `${lbIndex + 1}/${currentImages.length}`;
    $("#lbCode").value = codeFor(img);
    $("#lbOpen").href = imageUrl(img.path);
    const many = currentImages.length > 1;
    $("#lbPrev").hidden = $("#lbNext").hidden = !many;
  }
  function openLightbox(i) {
    lbIndex = i;
    showLb();
    if (!lb.open) lb.showModal();
  }
  const step = (d) => { lbIndex = (lbIndex + d + currentImages.length) % currentImages.length; showLb(); };

  $("#lbPrev").onclick = () => step(-1);
  $("#lbNext").onclick = () => step(1);
  $("#lbClose").onclick = () => lb.close();
  $("#lbCopy").onclick = () => copy($("#lbCode").value, $("#lbCopy"));
  $("#lbCode").onfocus = (e) => e.target.select();
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lb-stage")) lb.close(); });
  document.addEventListener("keydown", (e) => {
    if (!lb.open) {
      if (e.key === "/" && document.activeElement !== $("#search")) { e.preventDefault(); $("#search").focus(); }
      return;
    }
    if (e.key === "ArrowLeft") step(-1);
    else if (e.key === "ArrowRight") step(1);
    else if ((e.key === "c" || e.key === "C") && !e.metaKey && !e.ctrlKey) copy($("#lbCode").value, $("#lbCopy"));
  });
  let tx = null;
  lb.addEventListener("touchstart", (e) => { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (tx === null) return;
    const dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 50) step(dx < 0 ? 1 : -1);
    tx = null;
  });

  /* ---------- réglages ---------- */
  function syncSeg(sel, attr, val) {
    document.querySelectorAll(`${sel} button`).forEach((b) => b.setAttribute("aria-checked", b.dataset[attr] === val));
  }
  syncSeg("#formatSeg", "f", format);
  $("#formatSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    format = b.dataset.f; store.set("format", format); syncSeg("#formatSeg", "f", format);
    if (lb.open) $("#lbCode").value = codeFor(currentImages[lbIndex]);
    toast({ url: "copie : lien direct", bbcode: "copie : [img]…[/img]", html: "copie : <img src=…>" }[format] || "");
  });

  let size = store.get("size") || "m";
  document.documentElement.dataset.size = size;
  syncSeg("#sizeSeg", "s", size);
  $("#sizeSeg").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    size = b.dataset.s; store.set("size", size);
    document.documentElement.dataset.size = size; syncSeg("#sizeSeg", "s", size);
  });

  const savedTheme = store.get("theme");
  if (savedTheme) document.documentElement.dataset.theme = savedTheme;
  $("#themeBtn").onclick = () => {
    const dark = document.documentElement.dataset.theme
      ? document.documentElement.dataset.theme === "dark"
      : matchMedia("(prefers-color-scheme: dark)").matches;
    const next = dark ? "light" : "dark";
    document.documentElement.dataset.theme = next; store.set("theme", next);
  };

  let searchTimer;
  $("#search").addEventListener("input", (e) => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = e.target.value;
      q.trim() ? renderSearch(q) : render(current || root);
    }, 120);
  });
  $("#search").addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.target.value = ""; render(current || root); e.target.blur(); }
  });

  /* ---------- démarrage ---------- */
  $("#siteTitle").textContent = CFG.title;
  $("#siteSub").textContent = CFG.subtitle;
  $("#siteFoot").textContent = CFG.footer;
  document.title = CFG.title;

  loadFiles().then((files) => {
    root = buildTree(files);
    const nFolders = nodes.size - 1;
    $("#stats").textContent = `${root.total} images · ${nFolders} dossiers`;
    window.addEventListener("hashchange", route);
    route();
  }).catch((err) => {
    main.innerHTML = `<div class="empty-msg"><p>la galerie n'a pas pu se charger.</p><p class="small">${esc(err.message)} — lance <code>node tools/build-manifest.mjs</code> ou renseigne <code>github</code> dans config.js.</p></div>`;
  });
})();
