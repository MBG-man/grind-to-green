document.addEventListener("DOMContentLoaded", async () => {
  const postContainer = document.getElementById("posts-container");
  const postContent = document.getElementById("post-content");
  const slug = new URLSearchParams(window.location.search).get("slug");

  // ============================
  // 🟩 LOAD ALL POSTS (HOMEPAGE ONLY)
  // ============================
  async function loadPosts() {
    try {
      const indexRes = await fetch("posts/index.json");
      if (!indexRes.ok) throw new Error("Cannot load posts/index.json");

      const postFiles = await indexRes.json();

      // 🚀 PARALLEL FETCH (FAST)
      const posts = await Promise.all(
        postFiles.map(async (file) => {
          const res = await fetch(`posts/${file}`);
          if (!res.ok) return null;
          return await res.json();
        })
      );

      // Remove failed ones
      const cleanPosts = posts.filter(Boolean);

      // Sort newest first
     cleanPosts.sort((a, b) => {
  // 🥇 Featured posts first
  if (a.featured && !b.featured) return -1;
  if (!a.featured && b.featured) return 1;

  // 🥈 Then sort by date
  return new Date(b.date) - new Date(a.date);
});

      return cleanPosts;
    } catch (error) {
      console.error("Error loading posts:", error);
      return [];
    }
  }

  // ============================
  // 🟦 LOAD SINGLE POST ONLY
  // ============================
  async function loadSinglePost(slug) {
    try {
      const res = await fetch(`posts/${slug}.json`);
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
      postContainer.innerHTML = `<p style="text-align:center;color:red;">⚠️ No posts found.</p>`;
      return;
    }

    postContainer.innerHTML = posts.map(post => `
      <div class="post-card">
        <a href="post.html?slug=${post.slug}">
          <h2>${post.title}</h2>
          <img src="${post.image}" alt="${post.alt}" loading="lazy" style="width:100%;max-height:200px;object-fit:cover;">
          <p>${post.description}</p>
          <small>${new Date(post.date).toLocaleDateString()}</small>
        </a>
      </div>
    `).join('');
  }

  // ============================
  // 🟥 DISPLAY SINGLE POST
  // ============================
  function displaySinglePost(post) {
    if (!postContent || !post) return;

    // Title
    document.title = post.title;

    // Meta Description
    let metaDesc = document.querySelector("meta[name='description']");
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute("content", post.description);

    // Canonical
    let canonical = document.querySelector("link[rel='canonical']");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;

    // Render content
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
      if (block.type === "table") {
        return renderTable(block);
      }
      return "";
    }).join("");

    postContent.innerHTML = `
      <h1>${post.title}</h1>
      <img src="${post.image}" alt="${post.alt}" loading="lazy">
      <p>${post.description}</p>
      <div>${renderedContent}</div>

      <div class="share-container">
        <h4>Share this post:</h4>
        <div class="share-buttons">
  <a class="facebook" href="#" target="_blank" title="Share on Facebook">
    <i class="fab fa-facebook-f"></i>
  </a>
  <a class="twitter" href="#" target="_blank" title="Share on Twitter">
    <i class="fab fa-twitter"></i>
  </a>
  <a class="whatsapp" href="#" target="_blank" title="Share on WhatsApp">
    <i class="fab fa-whatsapp"></i>
  </a>
  <a class="linkedin" href="#" target="_blank" title="Share on LinkedIn">
    <i class="fab fa-linkedin-in"></i>
  </a>
  <a class="telegram" href="#" target="_blank" title="Share on Telegram">
    <i class="fab fa-telegram-plane"></i>
  </a>
</div>
      </div>
    `;

    // Share links
    const postUrl = encodeURIComponent(window.location.href);
    const postTitle = encodeURIComponent(post.title);

    document.querySelector(".facebook").href = `https://www.facebook.com/sharer/sharer.php?u=${postUrl}`;
    document.querySelector(".twitter").href = `https://twitter.com/intent/tweet?url=${postUrl}&text=${postTitle}`;
    document.querySelector(".whatsapp").href = `https://wa.me/?text=${postTitle}%20${postUrl}`;
    document.querySelector(".linkedin").href = `https://www.linkedin.com/sharing/share-offsite/?url=${postUrl}`;
    document.querySelector(".telegram").href = `https://t.me/share/url?url=${postUrl}&text=${postTitle}`;

    // FAQ Schema
    if (post.faq && post.faq.length > 0) {
      document.querySelectorAll('script[type="application/ld+json"]').forEach(s => s.remove());

      const faqSchema = {
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
      };

      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(faqSchema);
      document.head.appendChild(script);
    }
  }

  // ============================
  // 🚀 PAGE DETECTION (KEY FIX)
  // ============================

  // 🟩 HOMEPAGE
  if (postContainer) {
    const posts = await loadPosts();
    displayPosts(posts);
  }

  // 🟥 SINGLE POST PAGE
  if (postContent && slug) {
    const post = await loadSinglePost(slug);
    if (post) displaySinglePost(post);
    else postContent.innerHTML = `<p style="color:red;text-align:center;">Post not found.</p>`;
  }
});

// ============================
// 🟪 MENU TOGGLE
// ============================
document.getElementById("main-menu-toggle")?.addEventListener("click", () => {
  document.getElementById("main-nav")?.classList.toggle("show");
});

document.querySelectorAll("#main-nav a").forEach(link => {
  link.addEventListener("click", () => {
    document.getElementById("main-nav")?.classList.remove("show");
  });
});