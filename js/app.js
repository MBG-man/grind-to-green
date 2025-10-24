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

        postContent.innerHTML = `
          <h1>${post.title}</h1>
          <img src="${post.image}" alt="${post.alt}" style="width:100%;max-height:300px;object-fit:cover;">
          <p>${post.description}</p>
          <div>${renderedContent}</div>
        `;
      }
    }
  } catch (err) {
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

