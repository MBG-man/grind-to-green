/* ==========================================================
   GrindToGreen — app.js
   ========================================================== */

document.addEventListener("DOMContentLoaded", async () => {

  const postContainer = document.getElementById("posts-container");
  const postContent   = document.getElementById("post-content");

  const SITE_URL         = "https://grindtogreen.com";
  const SITE_NAME        = "Grind To Green";
  const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;
  const CACHE_KEY        = "gtg_posts_v1";

  const AUTHOR = {
    name:   "eemkay",
    avatar: "/images/author-avatar.png",
    bio:    "Nigerian finance and crypto writer helping everyday Africans earn more, save smarter, and build real wealth. Writing at grindtogreen.com since 2025.",
    links:  { twitter: "https://twitter.com/grindtogreen", blog: "https://grindtogreen.com" }
  };

  const ICONS = {
    facebook: `<svg viewBox="0 0 24 24" class="share-svg" aria-hidden="true" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>`,
    twitter:  `<svg viewBox="0 0 24 24" class="share-svg" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>`,
    whatsapp: `<svg viewBox="0 0 24 24" class="share-svg" aria-hidden="true" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 2C6.477 2 2 6.478 2 12c0 1.744.453 3.382 1.239 4.811L2 22l5.335-1.399A9.956 9.956 0 0 0 12 22c5.523 0 10-4.478 10-10S17.52 2 12 2z"/></svg>`,
    linkedin: `<svg viewBox="0 0 24 24" class="share-svg" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>`,
    telegram: `<svg viewBox="0 0 24 24" class="share-svg" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`
  };

  let currentCategory = "all";

  // ============================
  // 🔗 SLUG DETECTION
  // Works for both:
  //   /post.html?slug=my-slug   (query param — most reliable)
  //   /my-slug                  (clean URL via Netlify rewrite)
  // ============================
  function getSlug() {
    // 1. Query param — always works, most reliable
    const paramSlug = new URLSearchParams(window.location.search).get("slug");
    if (paramSlug) return paramSlug;

    // 2. Clean path — works when Netlify rewrites /slug → /post.html
    const path = window.location.pathname;
    const ignored = ["/", "/index.html", "/post.html"];
    if (ignored.includes(path) || path.startsWith("/pages/")) return null;

    const clean = path.replace(/^\//, "").replace(/\.html$/, "");
    if (/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(clean)) return clean;

    return null;
  }

  const slug = getSlug();

  // ── CACHE ──────────────────────────────────────────────────
  function cacheGet(key) {
    try { return JSON.parse(sessionStorage.getItem(key)); } catch { return null; }
  }
  function cacheSet(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify(data)); } catch {}
  }

  // ── HELPERS ────────────────────────────────────────────────
  function getReadingTime(post) {
    const words = (post.content || [])
      .map(b => b.text || (b.items || []).join(" ") || "")
      .join(" ").trim().split(/\s+/).filter(Boolean).length;
    return `${Math.max(1, Math.round(words / 200))} min read`;
  }

  function getCategory(post) {
    if (typeof post.category === "string") return post.category;
    if (Array.isArray(post.categories) && post.categories.length) return post.categories[0];
    return "Uncategorized";
  }

  function fmtDate(d) {
    return new Date(d).toLocaleDateString("en-NG", { year:"numeric", month:"long", day:"numeric" });
  }

  // ============================
  // 🏠 HOMEPAGE
  // ============================
  if (postContainer) {
    showHomeSkeleton();
    const posts = await loadAllPosts();
    setupSearch(posts);
    setupCategoryFilter(posts);
    displayPosts(filterByCategory(posts, "all"));
  }

  // ============================
  // 📄 SINGLE POST PAGE
  // ============================
  if (postContent) {
    if (!slug) { window.location.replace("/"); return; }

    showPostSkeleton();

    const post = await loadOnePost(slug);

    if (!post) {
      postContent.innerHTML = `
        <div style="text-align:center;padding:60px 20px;">
          <h2 style="color:#e53e3e;margin-bottom:12px;">Post not found</h2>
          <p style="color:#4a627a;">This post does not exist or may have moved.</p>
          <a href="/" style="display:inline-block;margin-top:24px;padding:10px 28px;
             background:#2c7a4d;color:white;border-radius:40px;font-weight:600;">← Back to Home</a>
        </div>`;
      return;
    }

    displaySinglePost(post);

    // Load related posts in background — doesn't delay main content
    loadAllPosts().then(allPosts => {
      const related = allPosts
        .filter(p => p.slug !== post.slug && getCategory(p) === getCategory(post))
        .slice(0, 3);
      const slot = document.getElementById("related-posts-slot");
      if (slot && related.length) slot.innerHTML = buildRelatedHTML(related);
    });
  }

  // ============================
  // DATA FETCHING
  // ============================

  async function loadAllPosts() {
    const cached = cacheGet(CACHE_KEY);
    if (cached) return cached;

    try {
      // Use absolute paths — safe for all URL structures
      const indexRes = await fetch("/posts/index.json");
      if (!indexRes.ok) throw new Error("index.json not found");
      const files = await indexRes.json();

      const posts = (await Promise.all(
        files.map(f => fetch(`/posts/${f}`).then(r => r.ok ? r.json() : null))
      )).filter(Boolean);

      posts.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return new Date(b.date) - new Date(a.date);
      });

      cacheSet(CACHE_KEY, posts);
      return posts;
    } catch (e) {
      console.error("loadAllPosts:", e);
      return [];
    }
  }

  async function loadOnePost(slug) {
    try {
      // Absolute path — critical when post.html is served via Netlify rewrite
      const res = await fetch(`/posts/${slug}.json`);
      if (!res.ok) throw new Error(`Post not found: ${slug}`);
      return await res.json();
    } catch (e) {
      console.error("loadOnePost:", e);
      return null;
    }
  }

  // ============================
  // SKELETON LOADERS
  // ============================

  function showHomeSkeleton() {
    postContainer.innerHTML = Array(6).fill(`
      <div class="skeleton-card">
        <div class="skeleton-img skeleton-pulse"></div>
        <div class="skeleton-line skeleton-pulse" style="width:85%"></div>
        <div class="skeleton-line skeleton-pulse" style="width:65%"></div>
        <div class="skeleton-line skeleton-pulse" style="width:50%;height:10px"></div>
      </div>
    `).join("");
  }

  function showPostSkeleton() {
    postContent.innerHTML = `
      <div class="skeleton-post">
        <div class="skeleton-line skeleton-pulse" style="width:90%;height:32px;margin-bottom:16px"></div>
        <div class="skeleton-line skeleton-pulse" style="width:50%;height:14px;margin-bottom:24px"></div>
        <div class="skeleton-img skeleton-pulse" style="height:280px;border-radius:14px;margin-bottom:24px"></div>
        <div class="skeleton-line skeleton-pulse" style="width:95%"></div>
        <div class="skeleton-line skeleton-pulse" style="width:88%"></div>
        <div class="skeleton-line skeleton-pulse" style="width:92%"></div>
        <div class="skeleton-line skeleton-pulse" style="width:80%"></div>
        <div class="skeleton-line skeleton-pulse" style="width:86%"></div>
      </div>
    `;
  }

  // ============================
  // HOMEPAGE FEATURES
  // ============================

  function setupSearch(posts) {
    const wrapper = document.createElement("div");
    wrapper.className = "search-wrapper";
    wrapper.innerHTML = `
      <div class="search-inner">
        <span class="search-icon">🔍</span>
        <input id="post-search" type="search"
               placeholder="Search articles…"
               autocomplete="on"
               aria-label="Search articles">
      </div>`;

    const filterEl = document.getElementById("category-filter");
    (filterEl || postContainer).parentNode.insertBefore(wrapper, filterEl || postContainer);

    let debounce;
    wrapper.querySelector("#post-search").addEventListener("input", e => {
      clearTimeout(debounce);
      debounce = setTimeout(() => {
        const q = e.target.value.trim().toLowerCase();
        displayPosts(q
          ? posts.filter(p =>
              p.title.toLowerCase().includes(q) ||
              p.description.toLowerCase().includes(q) ||
              getCategory(p).toLowerCase().includes(q))
          : filterByCategory(posts, currentCategory)
        );
      }, 180);
    });
  }

  function setupCategoryFilter(posts) {
    const cats = [...new Set(posts.map(getCategory))].sort();

    let el = document.getElementById("category-filter");
    if (!el) {
      el = document.createElement("div");
      el.id = "category-filter";
      el.className = "category-filter-container";
      postContainer.parentNode.insertBefore(el, postContainer);
    }

    el.innerHTML = `
      <span class="filter-label">Filter:</span>
      <button class="category-pill active" data-category="all">All</button>
      ${cats.map(c => `<button class="category-pill" data-category="${c}">${c}</button>`).join("")}
    `;

    el.querySelectorAll(".category-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        el.querySelectorAll(".category-pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentCategory = btn.dataset.category;
        const sb = document.getElementById("post-search");
        if (sb) sb.value = "";
        displayPosts(filterByCategory(posts, currentCategory));
      });
    });
  }

  function filterByCategory(posts, cat) {
    return cat === "all" ? [...posts] : posts.filter(p => getCategory(p) === cat);
  }

  function displayPosts(posts) {
    if (!postContainer) return;
    if (!posts.length) {
      postContainer.innerHTML = `<p style="text-align:center;color:#e53e3e;grid-column:1/-1">⚠️ No posts found.</p>`;
      return;
    }
    // IMPORTANT: links use ?slug= so they work on both GitHub Pages and Netlify
    // The _redirects file handles the 301 to clean URL on Netlify
    postContainer.innerHTML = posts.map(post => `
      <article class="post-card">
        <a href="/${post.slug}">
          <h2>${post.title}</h2>
          <img src="${post.image}" alt="${post.alt || post.title}"
               loading="lazy" width="400" height="200">
          <p>${post.description}</p>
          <div class="post-card-meta">
            <small>${fmtDate(post.date)}</small>
            <small class="reading-time">⏱ ${getReadingTime(post)}</small>
          </div>
          <div class="post-categories">
            <span class="post-category-badge">📁 ${getCategory(post)}</span>
          </div>
        </a>
      </article>
    `).join("");
  }

  // ============================
  // SINGLE POST RENDERING
  // ============================

  function displaySinglePost(post) {
    updateMeta(post);

    const toc        = buildTOC(post);
    const body       = renderBlocks(post.content || []);
    const faqHTML    = buildFAQ(post.faq);
    const adviceHTML = post.final_advice
      ? `<div class="final-advice"><p>${post.final_advice.text}</p></div>` : "";
    const authorHTML = buildAuthor();
    const shareHTML  = buildShare(post);
    const readTime   = getReadingTime(post);

    postContent.innerHTML = `
      <article class="post-content" itemscope itemtype="https://schema.org/Article">

        <h1 itemprop="headline">${post.title}</h1>

        <div class="post-meta-bar">
          <span>📅 ${fmtDate(post.date)}</span>
          <span>⏱ ${readTime}</span>
          <span>📁 ${getCategory(post)}</span>
        </div>

        <img src="${post.image}" alt="${post.alt || post.title}"
             loading="eager" itemprop="image" width="880" height="440">

        <p class="post-description"><em>${post.description}</em></p>

        ${toc}

        <div itemprop="articleBody">${body}</div>

        ${faqHTML}
        ${adviceHTML}
        ${authorHTML}
        ${shareHTML}

      </article>

      <div id="related-posts-slot"></div>
    `;

    attachTOCIds(post);
  }

  function renderBlocks(blocks) {
    return blocks.map(b => {
      if (b.type === "paragraph") return `<p>${b.text}</p>`;
      if (b.type === "heading")   return `<h2>${b.text}</h2>`;
      if (b.type === "list")      return `<ul>${b.items.map(i => `<li>${i}</li>`).join("")}</ul>`;
      if (b.type === "image")     return `
        <figure class="post-image">
          <img src="${b.src}" alt="${b.alt}" loading="lazy">
          ${b.caption ? `<figcaption>${b.caption}</figcaption>` : ""}
        </figure>`;
      if (b.type === "table")     return renderTable(b);
      return "";
    }).join("");
  }

  function renderTable(b) {
    const h = (b.headers || []).map(c => `<th>${c}</th>`).join("");
    const r = (b.rows || []).map(row =>
      `<tr>${row.map(c => `<td>${c}</td>`).join("")}</tr>`
    ).join("");
    return `
      <div class="table-wrapper">
        <table class="post-table">
          <thead><tr>${h}</tr></thead>
          <tbody>${r}</tbody>
        </table>
      </div>`;
  }

  function buildTOC(post) {
    const hs = (post.content || []).filter(b => b.type === "heading");
    if (hs.length < 3) return "";
    return `
      <nav class="toc" aria-label="Table of contents">
        <div class="toc-title">📋 In This Article</div>
        <ol class="toc-list">
          ${hs.map((h, i) => `<li><a href="#h${i}" class="toc-link">${h.text}</a></li>`).join("")}
        </ol>
      </nav>`;
  }

  function attachTOCIds(post) {
    const hs = (post.content || []).filter(b => b.type === "heading");
    postContent.querySelectorAll(".post-content h2").forEach((el, i) => {
      if (hs[i]) el.id = `h${i}`;
    });
    postContent.querySelectorAll(".toc-link").forEach(a => {
      a.addEventListener("click", e => {
        e.preventDefault();
        document.querySelector(a.getAttribute("href"))
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    });
  }

  function buildFAQ(faq) {
    if (!faq?.length) return "";
    return `
      <section class="faq-section" aria-label="Frequently asked questions">
        <h2>Frequently Asked Questions</h2>
        ${faq.map(f => `
          <div class="faq-item">
            <h3 class="faq-question">${f.question}</h3>
            <p class="faq-answer">${f.answer}</p>
          </div>`).join("")}
      </section>`;
  }

  function buildRelatedHTML(related) {
    return `
      <section class="related-posts" aria-label="Related articles">
        <h2 class="related-title">📖 You Might Also Like</h2>
        <div class="related-grid">
          ${related.map(p => `
            <a href="/${p.slug}" class="related-card">
              <img src="${p.image}" alt="${p.alt || p.title}"
                   loading="lazy" width="320" height="180">
              <div class="related-card-body">
                <span class="related-category">📁 ${getCategory(p)}</span>
                <h3>${p.title}</h3>
                <span class="related-time">⏱ ${getReadingTime(p)}</span>
              </div>
            </a>`).join("")}
        </div>
      </section>`;
  }

  function buildAuthor() {
    return `
      <div class="author-bio" itemscope itemtype="https://schema.org/Person">
        <img src="${AUTHOR.avatar}" alt="${AUTHOR.name}"
             class="author-avatar" loading="lazy" width="72" height="72"
             onerror="this.style.display='none'">
        <div class="author-info">
          <span class="author-label">Written by</span>
          <span class="author-name" itemprop="name">${AUTHOR.name}</span>
          <p class="author-desc" itemprop="description">${AUTHOR.bio}</p>
          <div class="author-links">
            <a href="${AUTHOR.links.blog}"    target="_blank" rel="noopener noreferrer">🌐 Blog</a>
            <a href="${AUTHOR.links.twitter}" target="_blank" rel="noopener noreferrer">🐦 Twitter / X</a>
          </div>
        </div>
      </div>`;
  }

  function buildShare(post) {
    const url   = encodeURIComponent(`${SITE_URL}/${post.slug}`);
    const title = encodeURIComponent(post.title);
    return `
      <div class="share-container">
        <h4>Share this post:</h4>
        <div class="share-buttons">
          <a class="share-btn facebook"
             href="https://www.facebook.com/sharer/sharer.php?u=${url}"
             target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
            ${ICONS.facebook}
          </a>
          <a class="share-btn twitter"
             href="https://twitter.com/intent/tweet?url=${url}&text=${title}"
             target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter">
            ${ICONS.twitter}
          </a>
          <a class="share-btn whatsapp"
             href="https://wa.me/?text=${title}%20${url}"
             target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
            ${ICONS.whatsapp}
          </a>
          <a class="share-btn linkedin"
             href="https://www.linkedin.com/sharing/share-offsite/?url=${url}"
             target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
            ${ICONS.linkedin}
          </a>
          <a class="share-btn telegram"
             href="https://t.me/share/url?url=${url}&text=${title}"
             target="_blank" rel="noopener noreferrer" aria-label="Share on Telegram">
            ${ICONS.telegram}
          </a>
        </div>
      </div>`;
  }

  function updateMeta(post) {
    const url = `${SITE_URL}/${post.slug}`;
    const img = post.image ? `${SITE_URL}/${post.image}` : DEFAULT_OG_IMAGE;

    document.title = `${post.title} | ${SITE_NAME}`;
    setMeta("meta[name='description']",         "content", post.description);
    setMeta("meta[property='og:title']",        "content", post.title);
    setMeta("meta[property='og:description']",  "content", post.description);
    setMeta("meta[property='og:url']",          "content", url);
    setMeta("meta[property='og:image']",        "content", img);
    setMeta("meta[name='twitter:title']",       "content", post.title);
    setMeta("meta[name='twitter:description']", "content", post.description);
    setMeta("meta[name='twitter:image']",       "content", img);

    const can = document.getElementById("canonical-link");
    if (can) can.href = url;

    injectSchema(post, url, img);
  }

  function setMeta(sel, attr, val) {
    let el = document.querySelector(sel);
    if (!el) {
      el = document.createElement("meta");
      const m = sel.match(/\[(\w+(?::\w+)?)=['"]([^'"]+)['"]\]/);
      if (m) el.setAttribute(m[1], m[2]);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, val);
  }

  function injectSchema(post, url, img) {
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => s.remove());
    const schemas = [{
      "@context": "https://schema.org", "@type": "Article",
      headline: post.title, description: post.description,
      url, image: img, datePublished: post.date, dateModified: post.date,
      author:    { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL }
    }];
    if (post.faq?.length) schemas.push({
      "@context": "https://schema.org", "@type": "FAQPage",
      mainEntity: post.faq.map(f => ({
        "@type": "Question", name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer }
      }))
    });
    schemas.forEach(s => {
      const sc = document.createElement("script");
      sc.type = "application/ld+json";
      sc.textContent = JSON.stringify(s);
      document.head.appendChild(sc);
    });
  }

});

// ── Menu toggle ────────────────────────────────────────────
document.getElementById("main-menu-toggle")?.addEventListener("click", function () {
  const nav = document.getElementById("main-nav");
  this.setAttribute("aria-expanded", nav?.classList.toggle("show") ? "true" : "false");
});
document.querySelectorAll("#main-nav a").forEach(a => a.addEventListener("click", () => {
  document.getElementById("main-nav")?.classList.remove("show");
  document.getElementById("main-menu-toggle")?.setAttribute("aria-expanded", "false");
}));