document.addEventListener("DOMContentLoaded", async () => {
  const postContainer = document.getElementById("posts-container");
  const postContent = document.getElementById("post-content");
  const slug = new URLSearchParams(window.location.search).get("slug");

  const SITE_URL = "https://grindtogreen.com";
  const SITE_NAME = "Grind To Green";
  const DEFAULT_OG_IMAGE = `${SITE_URL}/images/og-default.jpg`;

  let sortedAllPosts = [];
  let currentCategory = "all";

  // ============================
  // 🟩 LOAD ALL POSTS (HOMEPAGE)
  // ============================
  async function loadPosts() {
    try {
      const indexRes = await fetch("posts/index.json");
      if (!indexRes.ok) throw new Error("Cannot load posts/index.json");

      const postFiles = await indexRes.json();

      const posts = await Promise.all(
        postFiles.map(async (file) => {
          const res = await fetch(`posts/${file}`);
          if (!res.ok) return null;
          return await res.json();
        })
      );

      const cleanPosts = posts.filter(Boolean);

      cleanPosts.sort((a, b) => {
        if (a.featured && !b.featured) return -1;
        if (!a.featured && b.featured) return 1;
        return new Date(b.date) - new Date(a.date);
      });

      return cleanPosts;
    } catch (error) {
      console.error("Error loading posts:", error);
      return [];
    }
  }

  // ============================
  // 🟪 GET CATEGORY FROM POST
  // ============================
  function getPostCategory(post) {
    if (post.category && typeof post.category === "string") return post.category;
    if (post.categories && Array.isArray(post.categories) && post.categories.length) {
      return post.categories[0];
    }
    return "Uncategorized";
  }

  // ============================
  // 🎛️ CATEGORY FILTER — PILL BUTTONS
  // ============================
  function setupCategoryFilter(posts, onFilterChange) {
    const categorySet = new Set();
    posts.forEach(post => categorySet.add(getPostCategory(post)));
    const categories = Array.from(categorySet).sort();

    let filterContainer = document.getElementById("category-filter");
    if (!filterContainer) {
      filterContainer = document.createElement("div");
      filterContainer.id = "category-filter";
      filterContainer.className = "category-filter-container";
      postContainer.parentNode.insertBefore(filterContainer, postContainer);
    }

    // Build pill buttons instead of a select dropdown
    filterContainer.innerHTML = `
      <span class="filter-label">Filter:</span>
      <button class="category-pill active" data-category="all">All</button>
      ${categories.map(cat => `
        <button class="category-pill" data-category="${cat}">${cat}</button>
      `).join('')}
    `;

    filterContainer.querySelectorAll(".category-pill").forEach(btn => {
      btn.addEventListener("click", () => {
        filterContainer.querySelectorAll(".category-pill").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        currentCategory = btn.dataset.category;
        const filtered = filterPostsByCategory(posts, currentCategory);
        onFilterChange(filtered);
      });
    });
  }

  // ============================
  // 🔍 FILTER POSTS BY CATEGORY
  // ============================
  function filterPostsByCategory(posts, category) {
    if (category === "all") return [...posts];
    return posts.filter(post => getPostCategory(post) === category);
  }

  // ============================
  // 🟦 LOAD SINGLE POST
  // ============================
  async function loadSinglePost(slug) {
    try {
      const res = await fetch(`/posts/${slug}.json`);
      if (!res.ok) throw new Error("Post not found");
      return await res.json();
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  // ============================
  // 🟧 TABLE RENDER
  // ============================
  function renderTable(block) {
    const headers = Array.isArray(block.headers) ? block.headers : [];
    const rows = Array.isArray(block.rows) ? block.rows : [];
    return `
      <div class="table-wrapper">
        <table class="post-table">
          <thead>
            <tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.map(row => `
              <tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  // ============================
  // 🟨 DISPLAY HOMEPAGE POSTS
  // ============================
  function displayPosts(posts) {
    if (!postContainer) return;

    if (posts.length === 0) {
      postContainer.innerHTML = `<p style="text-align:center;color:red;">⚠️ No posts found in this category.</p>`;
      return;
    }

    postContainer.innerHTML = posts.map(post => `
      <article class="post-card">
        <a href="post.html?slug=${post.slug}">
          <h2>${post.title}</h2>
          <img src="${post.image}" alt="${post.alt}" loading="lazy" width="400" height="200">
          <p>${post.description}</p>
          <small>${new Date(post.date).toLocaleDateString("en-NG", { year: "numeric", month: "long", day: "numeric" })}</small>
          <div class="post-categories">
            <span class="post-category-badge">📁 ${getPostCategory(post)}</span>
          </div>
        </a>
      </article>
    `).join('');
  }

  // ============================
  // 🔵 UPDATE HEAD META TAGS
  // ============================
  function updateMeta(post) {
    const postUrl = `${SITE_URL}/post.html?slug=${post.slug}`;
    const ogImage = post.image
      ? `${SITE_URL}/${post.image}`
      : DEFAULT_OG_IMAGE;

    // Title
    document.title = `${post.title} | ${SITE_NAME}`;

    // Meta description
    setMeta("meta[name='description']", "content", post.description);

    // Canonical
    const canonical = document.getElementById("canonical-link");
    if (canonical) canonical.href = postUrl;

    // Open Graph
    setMeta("meta[property='og:title']", "content", post.title);
    setMeta("meta[property='og:description']", "content", post.description);
    setMeta("meta[property='og:url']", "content", postUrl);
    setMeta("meta[property='og:image']", "content", ogImage);

    // Twitter
    setMeta("meta[name='twitter:title']", "content", post.title);
    setMeta("meta[name='twitter:description']", "content", post.description);
    setMeta("meta[name='twitter:image']", "content", ogImage);

    // Article Schema
    injectArticleSchema(post, postUrl, ogImage);
  }

  function setMeta(selector, attr, value) {
    let el = document.querySelector(selector);
    if (!el) {
      el = document.createElement("meta");
      // Set the right attribute name from the selector
      const match = selector.match(/\[(\w+(?::\w+)?)=['"]([^'"]+)['"]\]/);
      if (match) el.setAttribute(match[1], match[2]);
      document.head.appendChild(el);
    }
    el.setAttribute(attr, value);
  }

  // ============================
  // 📰 ARTICLE SCHEMA
  // ============================
  function injectArticleSchema(post, postUrl, ogImage) {
    // Remove any existing schema
    document.querySelectorAll('script[type="application/ld+json"]').forEach(s => s.remove());

    const articleSchema = {
      "@context": "https://schema.org",
      "@type": "Article",
      "headline": post.title,
      "description": post.description,
      "url": postUrl,
      "image": ogImage,
      "datePublished": post.date,
      "dateModified": post.date,
      "author": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL
      },
      "publisher": {
        "@type": "Organization",
        "name": SITE_NAME,
        "url": SITE_URL
      }
    };

    const schemas = [articleSchema];

    // FAQ schema if available
    if (post.faq && post.faq.length > 0) {
      schemas.push({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": post.faq.map(item => ({
          "@type": "Question",
          "name": item.question,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": item.answer
          }
        }))
      });
    }

    schemas.forEach(schema => {
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(schema);
      document.head.appendChild(script);
    });
  }

  // ============================
  // 🟥 DISPLAY SINGLE POST
  // ============================
  function displaySinglePost(post) {
    if (!postContent || !post) return;

    // Update all meta and schema
    updateMeta(post);

    // Render content blocks
    const renderedContent = post.content.map(block => {
      if (block.type === "paragraph") return `<p>${block.text}</p>`;
      if (block.type === "heading") return `<h2>${block.text}</h2>`;
      if (block.type === "list") {
        return `<ul>${block.items.map(item => `<li>${item}</li>`).join('')}</ul>`;
      }
      if (block.type === "image") {
        return `
          <figure class="post-image">
            <img src="${block.src}" alt="${block.alt}" loading="lazy">
            ${block.caption ? `<figcaption>${block.caption}</figcaption>` : ""}
          </figure>
        `;
      }
      if (block.type === "table") return renderTable(block);
      return "";
    }).join("");

    // Render FAQ section if available
    const faqHTML = post.faq && post.faq.length > 0 ? `
      <section class="faq-section" aria-label="Frequently asked questions">
        <h2>Frequently Asked Questions</h2>
        ${post.faq.map(item => `
          <div class="faq-item">
            <h3 class="faq-question">${item.question}</h3>
            <p class="faq-answer">${item.answer}</p>
          </div>
        `).join('')}
      </section>
    ` : "";

    // Render final advice if available
    const finalAdviceHTML = post.final_advice ? `
      <div class="final-advice">
        <p>${post.final_advice.text}</p>
      </div>
    ` : "";

    const postUrl = encodeURIComponent(`${SITE_URL}/post.html?slug=${post.slug}`);
    const postTitle = encodeURIComponent(post.title);

    postContent.innerHTML = `
      <article class="post-content" itemscope itemtype="https://schema.org/Article">
        <h1 itemprop="headline">${post.title}</h1>
        <img src="${post.image}" alt="${post.alt}" loading="lazy" itemprop="image">
        <p class="post-description"><em>${post.description}</em></p>
        <div itemprop="articleBody">${renderedContent}</div>

        ${faqHTML}
        ${finalAdviceHTML}

        <div class="share-container">
          <h4>Share this post:</h4>
          <div class="share-buttons">
            <a class="facebook"
               href="https://www.facebook.com/sharer/sharer.php?u=${postUrl}"
               target="_blank" rel="noopener noreferrer" aria-label="Share on Facebook">
              <i class="fab fa-facebook-f"></i>
            </a>
            <a class="twitter"
               href="https://twitter.com/intent/tweet?url=${postUrl}&text=${postTitle}"
               target="_blank" rel="noopener noreferrer" aria-label="Share on Twitter">
              <i class="fab fa-twitter"></i>
            </a>
            <a class="whatsapp"
               href="https://wa.me/?text=${postTitle}%20${postUrl}"
               target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp">
              <i class="fab fa-whatsapp"></i>
            </a>
            <a class="linkedin"
               href="https://www.linkedin.com/sharing/share-offsite/?url=${postUrl}"
               target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn">
              <i class="fab fa-linkedin-in"></i>
            </a>
            <a class="telegram"
               href="https://t.me/share/url?url=${postUrl}&text=${postTitle}"
               target="_blank" rel="noopener noreferrer" aria-label="Share on Telegram">
              <i class="fab fa-telegram-plane"></i>
            </a>
          </div>
        </div>
      </article>
    `;
  }

  // ============================
  // 🚀 PAGE DETECTION
  // ============================

  // HOMEPAGE
  if (postContainer) {
    sortedAllPosts = await loadPosts();
    setupCategoryFilter(sortedAllPosts, (filteredPosts) => {
      displayPosts(filteredPosts);
    });
    displayPosts(sortedAllPosts);
  }

  // SINGLE POST PAGE
  if (postContent && slug) {
    const post = await loadSinglePost(slug);
    if (post) displaySinglePost(post);
    else postContent.innerHTML = `<p style="color:red;text-align:center;">Post not found.</p>`;
  }
});

// ============================
// 🟪 MENU TOGGLE
// ============================
document.getElementById("main-menu-toggle")?.addEventListener("click", function () {
  const nav = document.getElementById("main-nav");
  const expanded = nav?.classList.toggle("show");
  this.setAttribute("aria-expanded", expanded ? "true" : "false");
});

document.querySelectorAll("#main-nav a").forEach(link => {
  link.addEventListener("click", () => {
    document.getElementById("main-nav")?.classList.remove("show");
    document.getElementById("main-menu-toggle")?.setAttribute("aria-expanded", "false");
  });
});
