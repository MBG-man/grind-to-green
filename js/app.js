 document.addEventListener("DOMContentLoaded", async () => {
  const postContainer = document.getElementById("posts-container");
  const postContent = document.getElementById("post-content");
  const slug = new URLSearchParams(window.location.search).get("slug");

  try {
    const res = await fetch("posts/posts.json");
    const data = await res.json();

    if (postContainer) {
      postContainer.innerHTML = data.posts.map(post => `
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

    if (postContent && slug) {
  const post = data.posts.find(p => p.slug === slug);
  if (post) {
    const renderedContent = post.content.map(block => {
      if (block.type === "paragraph") {
        return `<p>${block.text}</p>`;
      } else if (block.type === "heading") {
        return `<h2>${block.text}</h2>`;
      } else if (block.type === "list") {
        return `<ul>${block.items.map(item => `<li>${item}</li>`).join('')}</ul>`;
      }
      return '';
    }).join('');

    // Insert post content
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

    // Set the dynamic share links
    const postUrl = encodeURIComponent(window.location.href);
    const postTitle = encodeURIComponent(post.title);

    document.querySelector('.facebook').href = `https://www.facebook.com/sharer/sharer.php?u=${postUrl}`;
    document.querySelector('.twitter').href = `https://twitter.com/intent/tweet?url=${postUrl}&text=${postTitle}`;
    document.querySelector('.whatsapp').href = `https://wa.me/?text=${postTitle}%20${postUrl}`;
    document.querySelector('.linkedin').href = `https://www.linkedin.com/sharing/share-offsite/?url=${postUrl}`;
    document.querySelector('.telegram').href = `https://t.me/share/url?url=${postUrl}&text=${postTitle}`;
  }
}

    }
   catch (err) {
    console.error("Failed to load posts", err);
  }
});
// Toggle mobile nav menu safely by ID
document.getElementById("main-menu-toggle").addEventListener("click", function () {
  document.getElementById("main-nav").classList.toggle("show");
});
// automation tagle
const navLinks = document.querySelectorAll("#main-nav a");
  link.addEventListener("click", () => {
    document.getElementById("main-nav").classList.remove("show");
  });

  // dark mode
  const toggleSwitch = document.querySelector('.switch .input');

  // Check saved theme
  if (localStorage.getItem('theme') === 'dark') {
    document.body.classList.add('dark-mode');
    toggleSwitch.checked = true;
  }

  // Listen for toggle
  toggleSwitch.addEventListener('change', () => {
    if (toggleSwitch.checked) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  });

