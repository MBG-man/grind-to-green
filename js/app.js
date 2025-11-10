document.addEventListener("DOMContentLoaded", async () => {
  const postContainer = document.getElementById("posts-container");
  const postContent = document.getElementById("post-content");
  const slug = new URLSearchParams(window.location.search).get("slug");

  // ============================
  // 🟩 FUNCTION: Load all posts
  // ============================
  async function loadPosts() {
    try {
      const indexRes = await fetch("posts/index.json");
      if (!indexRes.ok) throw new Error("Cannot load posts/index.json");

      const postFiles = await indexRes.json(); // e.g. ["post1.json", "post2.json"]
      const posts = [];

      for (const file of postFiles) {
        const res = await fetch(`posts/${file}`);
        if (!res.ok) continue;
        const post = await res.json();
        posts.push(post);
      }

      // Sort by newest first
      posts.sort((a, b) => new Date(b.date) - new Date(a.date));
      return posts;
    } catch (error) {
      console.error("Error loading posts:", error);
      return [];
    }
  }

  // ============================
  // 🟦 FUNCTION: Display posts on homepage
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
          <img src="${post.image}" alt="${post.alt}" style="width:100%;max-height:200px;object-fit:cover;">
          <p>${post.description}</p>
          <small>${new Date(post.date).toLocaleDateString()}</small>
        </a>
      </div>
    `).join('');
  }

  // ============================
  // 🟧 FUNCTION: Display single post
  // ============================
  function displaySinglePost(post) {
    if (!postContent) return;

    const renderedContent = post.content.map(block => {
      if (block.type === "paragraph") return `<p>${block.text}</p>`;
      if (block.type === "heading") return `<h2>${block.text}</h2>`;
      if (block.type === "list")
        return `<ul>${block.items.map(item => `<li>${item}</li>`).join('')}</ul>`;
      return "";
    }).join("");

    postContent.innerHTML = `
      <h1>${post.title}</h1>
      <img src="${post.image}" alt="${post.alt}" style="width:100%;max-height:300px;object-fit:cover;">
      <p>${post.description}</p>
      <div>${renderedContent}</div>
      <div class="share-container">
        <h4>Share this post:</h4>
        <div class="share-buttons">
          <a class="facebook" href="#" target="_blank" title="Share on Facebook"><i class="fab fa-facebook-f"></i></a>
          <a class="twitter" href="#" target="_blank" title="Share on Twitter"><i class="fab fa-twitter"></i></a>
          <a class="whatsapp" href="#" target="_blank" title="Share on WhatsApp"><i class="fab fa-whatsapp"></i></a>
          <a class="linkedin" href="#" target="_blank" title="Share on LinkedIn"><i class="fab fa-linkedin-in"></i></a>
          <a class="telegram" href="#" target="_blank" title="Share on Telegram"><i class="fab fa-telegram-plane"></i></a>
        </div>
      </div>
    `;

    // Update share links dynamically
    const postUrl = encodeURIComponent(window.location.href);
    const postTitle = encodeURIComponent(post.title);

    document.querySelector(".facebook").href = `https://www.facebook.com/sharer/sharer.php?u=${postUrl}`;
    document.querySelector(".twitter").href = `https://twitter.com/intent/tweet?url=${postUrl}&text=${postTitle}`;
    document.querySelector(".whatsapp").href = `https://wa.me/?text=${postTitle}%20${postUrl}`;
    document.querySelector(".linkedin").href = `https://www.linkedin.com/sharing/share-offsite/?url=${postUrl}`;
    document.querySelector(".telegram").href = `https://t.me/share/url?url=${postUrl}&text=${postTitle}`;
  }

  // ============================
  // 🟨 DETECT PAGE + LOAD CONTENT
  // ============================
  const posts = await loadPosts();

  if (postContainer) {
    // Homepage
    displayPosts(posts);
  }

  if (postContent && slug) {
    // Single Post
    const post = posts.find(p => p.slug === slug);
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

// Close menu on link click
document.querySelectorAll("#main-nav a").forEach(link => {
  link.addEventListener("click", () => {
    document.getElementById("main-nav")?.classList.remove("show");
  });
});

// ============================
// 🌙 DARK MODE TOGGLE
// ============================
const toggleSwitch = document.querySelector('.switch input');

if (localStorage.getItem('theme') === 'dark') {
  document.body.classList.add('dark-mode');
  if (toggleSwitch) toggleSwitch.checked = true;
}

if (toggleSwitch) {
  toggleSwitch.addEventListener('change', () => {
    if (toggleSwitch.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  });
}
