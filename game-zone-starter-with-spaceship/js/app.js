const games = [
  {
    id: "example",
    title: "Example (pygbag / Pygame)",
    description: "A placeholder showing how to embed a built game.",
    thumb: "assets/thumb-example.png",
    url: "games/example/index.html",
    tags: ["pygame", "wasm"]
  }
];

function cardTemplate(g){
  return `
    <article class="card" data-tags="${(g.tags||[]).join(',')}">
      <span class="badge">${(g.tags||[])[0] || "game"}</span>
      <div class="thumb"><img src="${g.thumb}" alt="${g.title} thumbnail"></div>
      <h3>${g.title}</h3>
      <p>${g.description}</p>
      <div class="meta">
        <span>${(g.tags||[]).join(' • ')}</span>
      </div>
      <div class="open">
        <a href="${g.url}" aria-label="Open ${g.title}">Play ▶</a>
      </div>
    </article>
  `;
}

const grid = document.getElementById('gameGrid');
grid.innerHTML = games.map(cardTemplate).join('');

document.getElementById('year').textContent = new Date().getFullYear();

// Search
const q = document.getElementById('search');
q.addEventListener('input', () => {
  const term = q.value.toLowerCase();
  for(const card of grid.children){
    const text = card.innerText.toLowerCase();
    card.style.display = text.includes(term) ? '' : 'none';
  }
});

// Theme toggle
const themeToggle = document.getElementById('themeToggle');
function setTheme(light){
  document.documentElement.classList.toggle('light', !!light);
  localStorage.setItem('gz-theme', light ? 'light' : 'dark');
}
setTheme(localStorage.getItem('gz-theme') === 'light');
themeToggle.addEventListener('click', ()=> setTheme(!document.documentElement.classList.contains('light')));


games.push({
  id: "spaceship",
  title: "Space Shooter",
  description: "Arcade style spaceship shooter.",
  thumb: "assets/thumb-spaceship.png",
  url: "games/spaceship/index.html",
  tags: ["canvas","javascript"]
});
