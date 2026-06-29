#!/usr/bin/env node
/**
 * GrindToGreen — Static Site Builder
 * -----------------------------------
 * Reads every post JSON from /posts/index.json,
 * generates a fully pre-rendered HTML file for each post,
 * and writes them to /dist/ (Netlify publish directory).
 *
 * Run:  node build.js
 * Output: dist/[slug]/index.html  (one file per post)
 *         dist/index.html          (homepage with all posts)
 *         dist/_redirects          (updated redirects)
 */

const fs   = require("fs");
const path = require("path");

// ─── CONFIG ────────────────────────────────────────────────────────────────
const SITE_URL    = "https://grindtogreen.com";
const SITE_NAME   = "Grind To Green";
const DEFAULT_IMG = `${SITE_URL}/images/og-default.jpg`;
const POSTS_DIR   = path.join(__dirname, "posts");
const DIST_DIR    = path.join(__dirname, "dist");
const AUTHOR = {
  name:    "Mubarak",
  bio:     "Personal finance and crypto writer focused on practical budgeting, investing, and digital income education for beginners.",
  twitter: "https://x.com/Mubarakgman",
  blog:    "https://grindtogreen.com"
};
const ADSENSE_ENABLED = process.env.ENABLE_ADSENSE === "true";

// ─── HELPERS ───────────────────────────────────────────────────────────────
function fmtDate(d) {
  return new Date(d).toLocaleDateString("en-NG", {
    year: "numeric", month: "long", day: "numeric"
  });
}

function getCategory(post) {
  if (typeof post.category === "string") return post.category;
  if (Array.isArray(post.categories) && post.categories.length) return post.categories[0];
  return "Finance";
}

function getReadingTime(post) {
  const words = (post.content || [])
    .map(b => b.text || (b.items || []).join(" ") || "")
    .join(" ").trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function escHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Ensure image paths always start with / so they resolve correctly
// from any nested URL like /slug/index.html
function fixImgPath(src) {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  // Remove any accidental double slashes then ensure leading slash
  return "/" + src.replace(/^\/+/, "").replace(/\/\//g, "/");
}

// ─── CONTENT RENDERER ──────────────────────────────────────────────────────
function renderBlocks(blocks) {
  return (blocks || []).map(b => {
    switch (b.type) {
      case "paragraph":
        return `<p>${b.text || ""}</p>`;

      case "heading":
        return `<h2>${escHtml(b.text)}</h2>`;

      case "list":
        return `<ul>${(b.items || []).map(i => `<li>${i}</li>`).join("")}</ul>`;

      case "table": {
        const headers = (b.headers || []).map(h => `<th>${escHtml(h)}</th>`).join("");
        const rows    = (b.rows || []).map(row =>
          `<tr>${row.map(c => `<td>${c}</td>`).join("")}</tr>`
        ).join("");
        return `
          <div class="table-wrapper">
            <table class="post-table">
              <thead><tr>${headers}</tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      }

      case "image":
        return `
          <figure class="post-image">
            <img src="${fixImgPath(b.src)}" alt="${escHtml(b.alt)}" loading="lazy">
            ${b.caption ? `<figcaption>${escHtml(b.caption)}</figcaption>` : ""}
          </figure>`;

      default:
        return "";
    }
  }).join("\n");
}

function buildTOC(post) {
  const headings = (post.content || []).filter(b => b.type === "heading");
  if (headings.length < 3) return "";
  const items = headings.map((h, i) =>
    `<li><a href="#h${i}" class="toc-link">${escHtml(h.text)}</a></li>`
  ).join("");
  return `
    <nav class="toc" aria-label="Table of contents">
      <div class="toc-title">📋 In This Article</div>
      <ol class="toc-list">${items}</ol>
    </nav>`;
}

function injectHeadingIds(html, post) {
  let i = 0;
  return html.replace(/<h2>/g, () => `<h2 id="h${i++}">`);
}

function buildFAQ(faq) {
  if (!Array.isArray(faq) || !faq.length) return "";
  const items = faq.map(f => {
    const q = f.question || f.q || "";
    const a = f.answer   || f.a || "";
    return `
      <div class="faq-item">
        <h3 class="faq-question">${escHtml(q)}</h3>
        <p class="faq-answer">${a}</p>
      </div>`;
  }).join("");
  return `
    <section class="faq-section" aria-label="Frequently asked questions">
      <h2>Frequently Asked Questions</h2>
      ${items}
    </section>`;
}

function buildFinalAdvice(post) {
  const fa = post.final_advice;
  if (!fa) return "";
  const text = typeof fa === "string" ? fa : (fa.text || "");
  if (!text) return "";
  return `<div class="final-advice"><p>${text}</p></div>`;
}

function buildShareButtons(post) {
  const url   = encodeURIComponent(`${SITE_URL}/${post.slug}`);
  const title = encodeURIComponent(post.title);
  return `
    <div class="share-container">
      <h4>Share this post:</h4>
      <div class="share-buttons">
        <a class="share-btn facebook" href="https://www.facebook.com/sharer/sharer.php?u=${url}" target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
          <svg viewBox="0 0 24 24" class="share-svg" fill="currentColor"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </a>
        <a class="share-btn twitter" href="https://twitter.com/intent/tweet?url=${url}&text=${title}" target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter">
          <svg viewBox="0 0 24 24" class="share-svg" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/></svg>
        </a>
        <a class="share-btn whatsapp" href="https://wa.me/?text=${title}%20${url}" target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
          <svg viewBox="0 0 24 24" class="share-svg" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12 2C6.477 2 2 6.478 2 12c0 1.744.453 3.382 1.239 4.811L2 22l5.335-1.399A9.956 9.956 0 0 0 12 22c5.523 0 10-4.478 10-10S17.52 2 12 2z"/></svg>
        </a>
        <a class="share-btn linkedin" href="https://www.linkedin.com/sharing/share-offsite/?url=${url}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
          <svg viewBox="0 0 24 24" class="share-svg" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
        </a>
        <a class="share-btn telegram" href="https://t.me/share/url?url=${url}&text=${title}" target="_blank" rel="noopener noreferrer" aria-label="Share on Telegram">
          <svg viewBox="0 0 24 24" class="share-svg" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </a>
      </div>
    </div>`;
}

function buildAuthor() {
  return `
    <div class="author-bio" itemscope itemtype="https://schema.org/Person">
      <div class="author-info">
        <span class="author-label">Written by</span>
        <span class="author-name" itemprop="name">${AUTHOR.name}</span>
        <p class="author-desc" itemprop="description">${AUTHOR.bio}</p>
        <div class="author-links">
          <a href="${AUTHOR.blog}" target="_blank" rel="noopener noreferrer">Blog</a>
          <a href="${AUTHOR.twitter}" target="_blank" rel="noopener noreferrer">Twitter / X</a>
        </div>
      </div>
    </div>`;
}

function buildSchema(post, url, img) {
  const article = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": post.title,
    "description": post.description,
    "url": url,
    "image": img,
    "datePublished": post.date,
    "dateModified": post.dateModified || post.date,
    "author": { "@type": "Person", "name": AUTHOR.name, "url": AUTHOR.blog, "sameAs": [AUTHOR.twitter] },
    "publisher": { "@type": "Organization", "name": SITE_NAME, "url": SITE_URL },
    "mainEntityOfPage": { "@type": "WebPage", "@id": url }
  };

  let schemas = `<script type="application/ld+json">${JSON.stringify(article)}</script>`;

  if (Array.isArray(post.faq) && post.faq.length) {
    const faqSchema = {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": post.faq.map(f => ({
        "@type": "Question",
        "name": f.question || f.q || "",
        "acceptedAnswer": { "@type": "Answer", "text": f.answer || f.a || "" }
      }))
    };
    schemas += `\n<script type="application/ld+json">${JSON.stringify(faqSchema)}</script>`;
  }

  return schemas;
}

// ─── SHARED HTML PARTS ─────────────────────────────────────────────────────
function htmlHead(title, desc, url, img, extraSchemas = "") {
  const adsenseScript = ADSENSE_ENABLED
    ? `\n  <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1666678165948804" crossorigin="anonymous"></script>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escHtml(title)}</title>
  <meta name="description" content="${escHtml(desc)}">
  <link rel="canonical" href="${url}">

  <meta property="og:type"        content="article">
  <meta property="og:site_name"   content="${SITE_NAME}">
  <meta property="og:title"       content="${escHtml(title)}">
  <meta property="og:description" content="${escHtml(desc)}">
  <meta property="og:url"         content="${url}">
  <meta property="og:image"       content="${img}">
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${escHtml(title)}">
  <meta name="twitter:description" content="${escHtml(desc)}">
  <meta name="twitter:image"       content="${img}">

  <link rel="icon" type="image/png" sizes="32x32" href="/images/favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="/images/favicon-16x16.png">
  <link rel="apple-touch-icon"                    href="/images/apple-touch-icon.png">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
        media="print" onload="this.media='all'">
  <noscript>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
  </noscript>

  <link rel="stylesheet" href="/css/style.css">
  <style>.share-svg{width:18px;height:18px;fill:currentColor;display:block;}</style>

  ${extraSchemas}${adsenseScript}
</head>`;
}

function htmlHeader() {
  return `
<header id="main-header">
  <div id="main-header-container">
    <a href="/" aria-label="Grind To Green Home">
      <svg xmlns="http://www.w3.org/2000/svg" width="180" height="44" viewBox="0 0 300 80" aria-hidden="true">
        <g transform="translate(10,15)">
          <rect x="0"  y="30" width="10" height="20" fill="#fff" rx="2"/>
          <rect x="15" y="20" width="10" height="30" fill="#fff" rx="2"/>
          <rect x="30" y="10" width="10" height="40" fill="#fff" rx="2"/>
          <rect x="45" y="0"  width="10" height="50" fill="#fff" rx="2"/>
        </g>
        <text x="75" y="50" font-family="Inter,sans-serif" font-size="28" font-weight="700" fill="#fff">
          Grind<tspan fill="#86efac">ToGreen</tspan>
        </text>
      </svg>
    </a>
    <nav id="main-nav" aria-label="Main navigation">
      <a href="/">Home</a>
      <a href="/pages/about">About</a>
      <a href="/pages/contact">Contact</a>
      <a href="/pages/privacy">Privacy</a>
      <a href="/pages/terms">Terms</a>
    </nav>
    <button id="main-menu-toggle" aria-label="Toggle navigation" aria-expanded="false">Menu</button>
  </div>
</header>`;
}

function htmlFooter() {
  return `
<footer class="footer">
  <p>&copy; <span id="footer-year"></span> Grind To Green. All rights reserved.</p>
</footer>
<script>document.getElementById("footer-year").textContent=new Date().getFullYear();</script>
<script>
  document.getElementById("main-menu-toggle")?.addEventListener("click",function(){
    const nav=document.getElementById("main-nav");
    this.setAttribute("aria-expanded",nav?.classList.toggle("show")?"true":"false");
  });
  document.querySelectorAll("#main-nav a").forEach(a=>a.addEventListener("click",()=>{
    document.getElementById("main-nav")?.classList.remove("show");
    document.getElementById("main-menu-toggle")?.setAttribute("aria-expanded","false");
  }));
</script>
<script data-collect-dnt="true" async src="https://scripts.simpleanalyticscdn.com/latest.js"></script>`;
}

// ─── BUILD ONE POST PAGE ────────────────────────────────────────────────────
function buildPostPage(post) {
  const url      = `${SITE_URL}/${post.slug}`;
  const imgRaw   = post.image || "";
  const img      = imgRaw.startsWith("http") ? imgRaw : `${SITE_URL}${fixImgPath(imgRaw)}`;
  const category = getCategory(post);
  const readTime = getReadingTime(post);
  const schemas  = buildSchema(post, url, img);

  let bodyContent = renderBlocks(post.content);
  const toc       = buildTOC(post);
  bodyContent     = injectHeadingIds(bodyContent, post);

  const faqHtml    = buildFAQ(post.faq);
  const adviceHtml = buildFinalAdvice(post);
  const shareHtml  = buildShareButtons(post);
  const authorHtml = buildAuthor();

  const heroImg = `<img src="${fixImgPath(post.image)}" alt="${escHtml(post.alt || post.title)}"
       loading="eager" itemprop="image" width="880" height="440"
       style="width:100%;height:auto;border-radius:14px;margin:1rem 0;">`;

  return `${htmlHead(
    `${post.title} | ${SITE_NAME}`,
    post.description || "",
    url,
    img,
    schemas
  )}
<body>
${htmlHeader()}

<main>
  <article class="post-content" itemscope itemtype="https://schema.org/Article">

    <h1 itemprop="headline">${post.title}</h1>

    <div class="post-meta-bar">
      <span>${fmtDate(post.date)}</span>
      <span>${readTime}</span>
      <span>${escHtml(category)}</span>
    </div>

    ${heroImg}

    ${post.description ? `<p class="post-description"><em>${post.description}</em></p>` : ""}

    ${toc}

    <div itemprop="articleBody">
      ${bodyContent}
    </div>

    ${faqHtml}
    ${adviceHtml}
    ${authorHtml}
    ${shareHtml}

  </article>
</main>

${htmlFooter()}
</body>
</html>`;
}

// ─── BUILD HOMEPAGE ─────────────────────────────────────────────────────────
function buildHomepage(posts) {
  const year = new Date().getFullYear();

  const postCards = posts.map(post => {
    const category = getCategory(post);
    const readTime = getReadingTime(post);
    return `
      <article class="post-card">
        <a href="/${post.slug}">
          <h2>${escHtml(post.title)}</h2>
          <img src="${fixImgPath(post.image)}" alt="${escHtml(post.alt || post.title)}"
               loading="lazy" width="400" height="200">
          <p>${escHtml(post.description || "")}</p>
          <div class="post-card-meta">
            <small>${fmtDate(post.date)}</small>
            <small class="reading-time">${readTime}</small>
          </div>
          <div class="post-categories">
            <span class="post-category-badge">${escHtml(category)}</span>
          </div>
        </a>
      </article>`;
  }).join("\n");

  // Build category filter pills
  const cats = [...new Set(posts.map(getCategory))].sort();
  const pills = cats.map(c =>
    `<button class="category-pill" data-category="${escHtml(c)}">${escHtml(c)}</button>`
  ).join("\n");

  return `${htmlHead(
    `${SITE_NAME} | Finance & Crypto Education for Africans`,
    "Master your money with budgeting tips, crypto insights, passive income strategies and side hustles built for Africans.",
    `${SITE_URL}/`,
    `${SITE_URL}/images/og-default.jpg`
  )}
<body>
${htmlHeader()}

<section class="hero">
  <h1>Turn Your Grind Into Real Wealth</h1>
  <p>Budgeting, crypto, investing and side hustles built for Africans.</p>
  <div>
    <a href="#posts" class="btn-primary">Read Articles</a>
    <a href="/pages/about" class="btn-secondary">About Us</a>
  </div>
</section>

<div class="search-wrapper">
  <div class="search-inner">
    <span class="search-icon">Search</span>
    <input id="post-search" type="search" placeholder="Search articles..." autocomplete="on" aria-label="Search articles">
  </div>
</div>

<div class="category-filter-container" id="category-filter">
  <span class="filter-label">Filter:</span>
  <button class="category-pill active" data-category="all">All</button>
  ${pills}
</div>



<main id="posts-container" aria-label="Blog posts" id="posts">
${postCards}
</main>

${htmlFooter()}

<script>
// Search
let currentCategory = "all";
const allCards = Array.from(document.querySelectorAll(".post-card"));

document.getElementById("post-search")?.addEventListener("input", function() {
  const q = this.value.trim().toLowerCase();
  allCards.forEach(card => {
    const text = card.innerText.toLowerCase();
    const catMatch = currentCategory === "all" || card.querySelector(".post-category-badge")?.innerText.toLowerCase().includes(currentCategory.toLowerCase());
    card.style.display = (!q || text.includes(q)) && catMatch ? "" : "none";
  });
});

// Category filter
document.querySelectorAll(".category-pill").forEach(btn => {
  btn.addEventListener("click", function() {
    document.querySelectorAll(".category-pill").forEach(b => b.classList.remove("active"));
    this.classList.add("active");
    currentCategory = this.dataset.category;
    const q = document.getElementById("post-search")?.value.trim().toLowerCase() || "";
    allCards.forEach(card => {
      const catBadge = card.querySelector(".post-category-badge")?.innerText || "";
      const catMatch = currentCategory === "all" || catBadge.toLowerCase().includes(currentCategory.toLowerCase());
      const textMatch = !q || card.innerText.toLowerCase().includes(q);
      card.style.display = catMatch && textMatch ? "" : "none";
    });
  });
});
</script>
</body>
</html>`;
}

// ─── MAIN BUILD ─────────────────────────────────────────────────────────────
function build() {
  // Read posts index
  const indexPath = path.join(POSTS_DIR, "index.json");
  if (!fs.existsSync(indexPath)) {
    console.error("❌  posts/index.json not found. Run this script from your repo root.");
    process.exit(1);
  }

  const fileList = JSON.parse(fs.readFileSync(indexPath, "utf8"));
  console.log(`📚  Found ${fileList.length} posts in index.json`);

  // Load all posts
  const posts = [];
  for (const file of fileList) {
    const filePath = path.join(POSTS_DIR, file);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️   Missing: posts/${file} — skipping`);
      continue;
    }
    try {
      const post = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (!post.slug) { console.warn(`⚠️   No slug in ${file} — skipping`); continue; }
      posts.push(post);
    } catch (e) {
      console.error(`❌  JSON parse error in ${file}:`, e.message);
    }
  }

  // Sort: featured first, then by date desc
  posts.sort((a, b) => {
    if (a.featured === true && b.featured !== true) return -1;
    if (b.featured === true && a.featured !== true) return 1;
    return new Date(b.date) - new Date(a.date);
  });

  // Create dist directory
  if (!fs.existsSync(DIST_DIR)) fs.mkdirSync(DIST_DIR, { recursive: true });

  // Copy static assets into dist
  copyDir(path.join(__dirname, "css"),    path.join(DIST_DIR, "css"));
  copyDir(path.join(__dirname, "js"),     path.join(DIST_DIR, "js"));
  copyDir(path.join(__dirname, "images"), path.join(DIST_DIR, "images"));
  copyDir(path.join(__dirname, "posts"),  path.join(DIST_DIR, "posts"));
  copyDir(path.join(__dirname, "pages"),  path.join(DIST_DIR, "pages"));
copyDir(path.join(__dirname, "tools"),  path.join(DIST_DIR, "tools"));
  // Copy root-level files that Netlify needs
  for (const f of ["robots.txt", "write-for-us.html"]) {
    const src = path.join(__dirname, f);
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, path.join(DIST_DIR, f));
      console.log(`✅  ${f}`);
    }
  }

  // Build each post page
  let built = 0;
  for (const post of posts) {
    const postDir = path.join(DIST_DIR, post.slug);
    fs.mkdirSync(postDir, { recursive: true });
    const html = buildPostPage(post);
    fs.writeFileSync(path.join(postDir, "index.html"), html, "utf8");
    console.log(`✅  /${post.slug}/`);
    built++;
  }

  // Build homepage
  const homepageHtml = buildHomepage(posts);
  fs.writeFileSync(path.join(DIST_DIR, "index.html"), homepageHtml, "utf8");
  console.log(`✅  / (homepage with ${posts.length} posts)`);

  // Write updated _redirects for dist
  const redirectsContent = buildRedirects(posts);
  fs.writeFileSync(path.join(DIST_DIR, "_redirects"), redirectsContent, "utf8");
  console.log(`✅  _redirects`);

  const sitemapContent = buildSitemap(posts);
  fs.writeFileSync(path.join(DIST_DIR, "sitemap.xml"), sitemapContent, "utf8");
  fs.writeFileSync(path.join(__dirname, "sitemap.xml"), sitemapContent, "utf8");
  console.log(`✅  sitemap.xml`);

  console.log(`\n🎉  Build complete — ${built} posts + homepage written to /dist/`);
  console.log(`    Deploy the /dist/ folder to Netlify as your publish directory.`);
}

function buildRedirects(posts) {
  // Static page redirects + catch-all
  const staticRedirects = `
# ── STATIC PAGES ───────────────────────────────────────────
/pages/about.html    /pages/about    301!
/pages/contact.html  /pages/contact  301!
/pages/privacy.html  /pages/privacy  301!
/pages/terms.html    /pages/terms    301!
/write-for-us.html   /write-for-us   301!
/building-wealth-from-scratch-2026  /building-wealth-from-scratch    301!

# ── SLUG FIXES ──────────────────────────────────────────────
/smart-budgeting-hacks-2025    /smart-budgeting-hacks-2026    301!
/why-most-traders-fail         /why-90-percent-of-traders-fail 301!

# ── OLD ?slug= FORMAT → CLEAN URLS ─────────────────────────`;

  const oldSlugRedirects = posts.map(post =>
    `/post.html?slug=${post.slug}    /${post.slug}/    301!`
  ).join("\n");

  const staticFiles = `

# ── ALLOW STATIC ASSETS ─────────────────────────────────────
/posts/*    /posts/:splat    200
/images/*   /images/:splat   200
/css/*       /css/:splat      200
/js/*        /js/:splat       200

# ── STATIC HTML PAGES ────────────────────────────────────────
/pages/about     /pages/about.html    200
/pages/contact   /pages/contact.html  200
/pages/privacy   /pages/privacy.html  200
/pages/terms     /pages/terms.html    200
/write-for-us    /write-for-us.html   200
/tools/budget-tools      /budget-tool.html    200
# ── HOMEPAGE ────────────────────────────────────────────────
/    /index.html    200`;

  return `# GrindToGreen _redirects — auto-generated by build.js\n${staticRedirects}\n${oldSlugRedirects}\n${staticFiles}`;
}

function buildSitemap(posts) {
  const staticUrls = [
    { loc: `${SITE_URL}/`, priority: "1.0", changefreq: "daily" },
    { loc: `${SITE_URL}/pages/about`, priority: "0.6", changefreq: "monthly" },
    { loc: `${SITE_URL}/pages/contact`, priority: "0.6", changefreq: "monthly" },
    { loc: `${SITE_URL}/pages/privacy`, priority: "0.5", changefreq: "yearly" },
    { loc: `${SITE_URL}/pages/terms`, priority: "0.5", changefreq: "yearly" },
    { loc: `${SITE_URL}/write-for-us`, priority: "0.4", changefreq: "monthly" }
  ];

  const postUrls = posts.map(post => ({
    loc: `${SITE_URL}/${post.slug}`,
    priority: "0.8",
    changefreq: "monthly",
    lastmod: post.date
  }));

  const urls = [...staticUrls, ...postUrls].map(item => `  <url>
    <loc>${item.loc}</loc>${item.lastmod ? `\n    <lastmod>${item.lastmod}</lastmod>` : ""}
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join("\n\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

// ─── COPY DIRECTORY HELPER ──────────────────────────────────────────────────
function copyDir(src, dest) {
  if (!fs.existsSync(src)) return; // silently skip missing folders
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath  = path.join(src,  entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  console.log(`✅  Copied → ${path.relative(__dirname, dest)}/`);
}

// ─── RUN ────────────────────────────────────────────────────────────────────
build(); 